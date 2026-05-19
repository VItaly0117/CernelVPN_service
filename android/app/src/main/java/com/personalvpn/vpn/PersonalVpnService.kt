package com.personalvpn.vpn

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.net.VpnService
import android.os.Build
import android.os.ParcelFileDescriptor
import android.util.Log
import androidx.core.app.NotificationCompat
import com.personalvpn.MainActivity
import org.json.JSONArray
import org.json.JSONObject

/**
 * PersonalVpnService — Android VpnService skeleton.
 *
 * Responsibilities:
 *   - Establish a TUN interface via VpnService.Builder
 *   - Run as a foreground service with a persistent notification
 *   - Manage the lifecycle of the VPN tunnel
 *   - Delegate traffic processing to CoreManager (stub for now)
 *
 * Important notes:
 *   - No real traffic routing is done in this MVP
 *   - The TUN fd is established but not read from
 *   - Split tunneling rules are prepared but applied as TODO
 */
class PersonalVpnService : VpnService() {

    companion object {
        private const val TAG = "PersonalVpnService"
        private const val CHANNEL_ID = "kernelvpn_channel"
        private const val NOTIFICATION_ID = 1
        const val ACTION_START = "com.kernelvpn.vpn.START"
        const val ACTION_STOP = "com.kernelvpn.vpn.STOP"
        const val EXTRA_START_PAYLOAD_JSON = "start_payload_json"

        /** Set to true ONLY when the real core is integrated. */
        const val DEMO_FULL_TUNNEL = false

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

        /** Callback for status changes — set by VpnBridgeModule. */
        var statusListener: ((VpnStatus) -> Unit)? = null
    }

    private var vpnInterface: ParcelFileDescriptor? = null
    private var core: CoreManager? = null

    // -------------------------------------------------------------------------
    // Lifecycle
    // -------------------------------------------------------------------------

    override fun onCreate() {
        super.onCreate()
        Log.i(TAG, "onCreate")
        createNotificationChannel()
        core = CoreManager()
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

                // Start foreground immediately (Android 8+ requirement)
                startForeground(NOTIFICATION_ID, buildNotification("Connecting…"))

                updateStatus(VpnStatus.CONNECTING)
                isServiceRunning = true

                val success = establishVpnInterface(
                    startConfig.splitTunnelMode,
                    startConfig.splitTunnelRules
                )
                if (success) {
                    // Start core (stub)
                    val fd = vpnInterface?.fd
                    val coreResult = core?.start(startConfig.profileJson, fd)
                    if (coreResult?.isSuccess == true) {
                        updateStatus(VpnStatus.CONNECTED)
                        updateNotification("Connected")
                        Log.i(TAG, "VPN tunnel established successfully")
                    } else {
                        Log.e(TAG, "Core failed to start")
                        updateStatus(VpnStatus.ERROR)
                        updateNotification("Error: core failed")
                    }
                } else {
                    Log.e(TAG, "Failed to establish VPN interface")
                    updateStatus(VpnStatus.ERROR)
                    stopSelf()
                }

                return START_STICKY
            }
        }
    }

    override fun onDestroy() {
        Log.i(TAG, "onDestroy")
        stopVpnTunnel()
        super.onDestroy()
    }

    override fun onRevoke() {
        Log.i(TAG, "onRevoke — VPN permission revoked by user/system")
        stopVpnTunnel()
        super.onRevoke()
    }

    // -------------------------------------------------------------------------
    // VPN Interface
    // -------------------------------------------------------------------------

    /**
     * Establish the TUN interface using VpnService.Builder.
     *
     * Returns true if the interface was established successfully.
     */
    private fun establishVpnInterface(
        splitTunnelMode: String,
        splitTunnelRules: List<SplitTunnelRuleData>
    ): Boolean {
        return try {
            // Close existing interface if any
            closeVpnInterface()

            val builder = Builder()
            builder.setSession("KernelVPN")
            builder.addAddress("10.0.0.2", 32)
            builder.addDnsServer("1.1.1.1")
            builder.addDnsServer("8.8.8.8")

            if (DEMO_FULL_TUNNEL) {
                // Full tunnel route must be enabled only after real core integration, otherwise traffic will be blackholed.
                builder.addRoute("0.0.0.0", 0) // Route all IPv4 traffic
            } else {
                // Safe route for testing VPN lifecycle without breaking internet
                builder.addRoute("203.0.113.0", 24)
            }

            applySplitTunneling(builder, splitTunnelRules, splitTunnelMode)

            // Allow the app itself to bypass VPN to prevent loops
            if (splitTunnelMode != "vpn_selected_only") {
                try {
                    builder.addDisallowedApplication(packageName)
                } catch (e: Exception) {
                    Log.w(TAG, "Could not disallow own package", e)
                }
            }

            // Set MTU
            builder.setMtu(1500)

            // Establish the interface
            vpnInterface = builder.establish()

            if (vpnInterface == null) {
                Log.e(TAG, "establish() returned null — VPN permission may be revoked")
                false
            } else {
                Log.i(TAG, "VPN interface established, fd=${vpnInterface?.fd}")
                true
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to establish VPN interface", e)
            false
        }
    }

    /**
     * Apply split tunneling rules to the VPN builder.
     *
     */
    private fun applySplitTunneling(
        builder: Builder,
        rules: List<SplitTunnelRuleData>,
        mode: String
    ) {
        val enabledRules = rules.filter { it.enabled }
        when (mode) {
            "vpn_all_except_selected" -> {
                // VPN everything, except selected apps go direct
                for (rule in enabledRules) {
                    try {
                        builder.addDisallowedApplication(rule.packageName)
                        Log.d(TAG, "Disallowed: ${rule.packageName}")
                    } catch (e: Exception) {
                        Log.w(TAG, "Failed to disallow ${rule.packageName}", e)
                    }
                }
            }
            "vpn_selected_only" -> {
                require(enabledRules.isNotEmpty()) {
                    "At least one app must be selected for vpn_selected_only mode"
                }
                // Only selected apps go through VPN
                for (rule in enabledRules) {
                    try {
                        builder.addAllowedApplication(rule.packageName)
                        Log.d(TAG, "Allowed: ${rule.packageName}")
                    } catch (e: Exception) {
                        Log.w(TAG, "Failed to allow ${rule.packageName}", e)
                    }
                }
            }
        }
    }

    private fun parseStartConfig(rawJson: String?): StartConfig {
        return try {
            if (rawJson.isNullOrBlank()) {
                return StartConfig("{}", "vpn_all_except_selected", emptyList())
            }

            val payload = JSONObject(rawJson)
            val profileJson = payload.optJSONObject("profile")?.toString() ?: rawJson
            val mode = payload.optString("splitTunnelMode", "vpn_all_except_selected")
            val rules = parseSplitTunnelRules(payload.optJSONArray("splitTunnelRules"))
            StartConfig(profileJson, mode, rules)
        } catch (e: Exception) {
            Log.w(TAG, "Failed to parse start payload; falling back to profile JSON", e)
            StartConfig(rawJson ?: "{}", "vpn_all_except_selected", emptyList())
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

    private fun stopVpnTunnel() {
        Log.i(TAG, "stopVpnTunnel")
        updateStatus(VpnStatus.DISCONNECTING)

        // Stop core
        core?.stop()

        // Close TUN interface
        closeVpnInterface()

        isServiceRunning = false
        coreManager = null
        currentSplitTunnelMode = "vpn_all_except_selected"
        currentSplitTunnelRuleCount = 0
        updateStatus(VpnStatus.DISCONNECTED)

        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    private fun closeVpnInterface() {
        try {
            vpnInterface?.close()
        } catch (e: Exception) {
            Log.w(TAG, "Error closing VPN interface", e)
        }
        vpnInterface = null
    }

    // -------------------------------------------------------------------------
    // Status
    // -------------------------------------------------------------------------

    private fun updateStatus(status: VpnStatus) {
        currentStatus = status
        statusListener?.invoke(status)
        Log.d(TAG, "Status updated: ${status.value}")
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
        val splitTunnelMode: String,
        val splitTunnelRules: List<SplitTunnelRuleData>
    )
}
