package com.personalvpn.vpn

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.net.VpnService
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat
import com.personalvpn.MainActivity
import org.json.JSONArray
import org.json.JSONObject

/**
 * PersonalVpnService — Android foreground VPN service.
 *
 * Responsibilities:
 *   - Run as a foreground service with a persistent notification
 *   - Manage the lifecycle of the VPN tunnel
 *   - Delegate TUN creation and traffic processing to CoreManager/libbox
 */
class PersonalVpnService : VpnService() {

    companion object {
        private const val TAG = "PersonalVpnService"
        private const val CHANNEL_ID = "kernelvpn_channel"
        private const val NOTIFICATION_ID = 1
        const val ACTION_START = "com.kernelvpn.vpn.START"
        const val ACTION_STOP = "com.kernelvpn.vpn.STOP"
        const val EXTRA_START_PAYLOAD_JSON = "start_payload_json"

        /** Whether the service is currently running. Checked by DiagnosticsManager. */
        @Volatile
        var isServiceRunning: Boolean = false
            private set

        /** Reference to the CoreManager, accessible for diagnostics. */
        var coreManager: CoreManager? = null
            private set

        /** Current VPN status — used by VpnBridgeModule to report back to JS. */
        @Volatile
        var currentStatus: VpnStatus = VpnStatus.DISCONNECTED
            private set

        @Volatile
        var currentSplitTunnelMode: String = "vpn_all_except_selected"
            private set

        @Volatile
        var currentSplitTunnelRuleCount: Int = 0
            private set

        @Volatile
        var currentActiveProfileName: String? = null
            private set

        @Volatile
        var currentSelectedProtocol: String? = null
            private set

        @Volatile
        var lastConnectionError: String? = null
            private set

        /** Callback for status changes — set by VpnBridgeModule. */
        var statusListener: ((VpnStatus) -> Unit)? = null

        /** Callback for errors — set by VpnBridgeModule. */
        var errorListener: ((String, String) -> Unit)? = null
    }

    private var core: CoreManager? = null
    private val mainHandler = Handler(Looper.getMainLooper())

    // -------------------------------------------------------------------------
    // Lifecycle
    // -------------------------------------------------------------------------

    override fun onCreate() {
        super.onCreate()
        Log.i(TAG, "onCreate")
        createNotificationChannel()
        core = CoreManager(this)
        coreManager = core
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.i(TAG, "onStartCommand: action=${intent?.action}")

        when (intent?.action) {
            ACTION_STOP -> {
                stopVpnTunnel()
                return START_NOT_STICKY
            }
            else -> {
                // Start or restart VPN
                val startConfig = parseStartConfig(
                    intent?.getStringExtra(EXTRA_START_PAYLOAD_JSON)
                )
                currentSplitTunnelMode = startConfig.splitTunnelMode
                currentSplitTunnelRuleCount = startConfig.splitTunnelRules.count { it.enabled }
                currentActiveProfileName = startConfig.profileName
                currentSelectedProtocol = startConfig.protocol
                lastConnectionError = null

                // Start foreground immediately (Android 8+ requirement)
                startForeground(NOTIFICATION_ID, buildNotification("Connecting…"))

                updateStatus(VpnStatus.CONNECTING)
                isServiceRunning = true

                startCoreAsync(startConfig)

                return START_STICKY
            }
        }
    }

    override fun onDestroy() {
        Log.i(TAG, "onDestroy")
        stopVpnTunnel(stopSelfAfter = false)
        super.onDestroy()
    }

    override fun onRevoke() {
        Log.i(TAG, "onRevoke — VPN permission revoked by user/system")
        stopVpnTunnel()
        super.onRevoke()
    }

    // -------------------------------------------------------------------------
    // Core lifecycle
    // -------------------------------------------------------------------------

    private fun startCoreAsync(startConfig: StartConfig) {
        Thread {
            val result = core?.start(startConfig.coreConfigJson)
                ?: Result.failure(IllegalStateException("CoreManager is unavailable"))

            mainHandler.post {
                if (result.isSuccess && core?.isRunning() == true) {
                    updateStatus(VpnStatus.CONNECTED)
                    updateNotification("Connected")
                    Log.i(TAG, "VPN core started successfully")
                } else {
                    val message = result.exceptionOrNull()?.message
                        ?: core?.getLastError()
                        ?: "Core failed to start"
                    failConnection("CORE_START_FAILED", message)
                }
            }
        }.apply {
            name = "KernelVPN-CoreStart"
            start()
        }
    }

    private fun parseStartConfig(rawJson: String?): StartConfig {
        return try {
            if (rawJson.isNullOrBlank()) {
                return StartConfig(
                    profileJson = "{}",
                    coreConfigJson = "",
                    splitTunnelMode = "vpn_all_except_selected",
                    splitTunnelRules = emptyList(),
                    profileName = null,
                    protocol = null
                )
            }

            val payload = JSONObject(rawJson)
            val profile = payload.optJSONObject("profile")
            val profileJson = profile?.toString() ?: rawJson
            val coreConfigJson = payload.optString("coreConfigJson", "")
            val mode = payload.optString("splitTunnelMode", "vpn_all_except_selected")
            val rules = parseSplitTunnelRules(payload.optJSONArray("splitTunnelRules"))
            StartConfig(
                profileJson = profileJson,
                coreConfigJson = coreConfigJson,
                splitTunnelMode = mode,
                splitTunnelRules = rules,
                profileName = profile?.optString("name")?.takeIf { it.isNotBlank() },
                protocol = profile?.optString("protocol")?.takeIf { it.isNotBlank() }
            )
        } catch (e: Exception) {
            Log.w(TAG, "Failed to parse start payload; falling back to profile JSON", e)
            StartConfig(
                profileJson = rawJson ?: "{}",
                coreConfigJson = "",
                splitTunnelMode = "vpn_all_except_selected",
                splitTunnelRules = emptyList(),
                profileName = null,
                protocol = null
            )
        }
    }

    private fun parseSplitTunnelRules(array: JSONArray?): List<SplitTunnelRuleData> {
        if (array == null) return emptyList()

        val result = mutableListOf<SplitTunnelRuleData>()
        for (index in 0 until array.length()) {
            val item = array.optJSONObject(index) ?: continue
            val packageName = item.optString("packageName", "")
            if (packageName.isBlank() || packageName == this.packageName) {
                continue
            }
            result.add(
                SplitTunnelRuleData(
                    packageName = packageName,
                    enabled = item.optBoolean("enabled", false)
                )
            )
        }
        return result
    }

    // -------------------------------------------------------------------------
    // Cleanup
    // -------------------------------------------------------------------------

    private fun stopVpnTunnel(stopSelfAfter: Boolean = true) {
        Log.i(TAG, "stopVpnTunnel")
        updateStatus(VpnStatus.DISCONNECTING)

        // Stop core
        core?.stop()

        isServiceRunning = false
        coreManager = null
        currentSplitTunnelMode = "vpn_all_except_selected"
        currentSplitTunnelRuleCount = 0
        currentActiveProfileName = null
        currentSelectedProtocol = null
        updateStatus(VpnStatus.DISCONNECTED)

        stopForeground(STOP_FOREGROUND_REMOVE)
        if (stopSelfAfter) {
            stopSelf()
        }
    }

    // -------------------------------------------------------------------------
    // Status
    // -------------------------------------------------------------------------

    private fun updateStatus(status: VpnStatus) {
        currentStatus = status
        statusListener?.invoke(status)
        Log.d(TAG, "Status updated: ${status.value}")
    }

    private fun failConnection(code: String, message: String) {
        lastConnectionError = message
        isServiceRunning = false
        core?.stop()
        updateStatus(VpnStatus.ERROR)
        updateNotification("Error: core failed")
        errorListener?.invoke(code, message)
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    // -------------------------------------------------------------------------
    // Notifications
    // -------------------------------------------------------------------------

    private fun createNotificationChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID,
            "KernelVPN Service",
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "Shows when KernelVPN is active"
            setShowBadge(false)
        }

        val nm = getSystemService(NotificationManager::class.java)
        nm?.createNotificationChannel(channel)
    }

    private fun buildNotification(contentText: String): Notification {
        val openAppIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this, 0, openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val stopIntent = Intent(this, PersonalVpnService::class.java).apply {
            action = ACTION_STOP
        }
        val stopPendingIntent = PendingIntent.getService(
            this, 1, stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("KernelVPN")
            .setContentText(contentText)
            .setSmallIcon(android.R.drawable.ic_lock_lock)
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .addAction(
                android.R.drawable.ic_menu_close_clear_cancel,
                "Disconnect",
                stopPendingIntent
            )
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    private fun updateNotification(contentText: String) {
        val nm = getSystemService(NotificationManager::class.java)
        nm?.notify(NOTIFICATION_ID, buildNotification(contentText))
    }

    // -------------------------------------------------------------------------
    // Data classes for split tunneling
    // -------------------------------------------------------------------------

    data class SplitTunnelRuleData(
        val packageName: String,
        val enabled: Boolean
    )

    data class StartConfig(
        val profileJson: String,
        val coreConfigJson: String,
        val splitTunnelMode: String,
        val splitTunnelRules: List<SplitTunnelRuleData>,
        val profileName: String?,
        val protocol: String?
    )
}
