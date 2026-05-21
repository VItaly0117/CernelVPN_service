package com.personalvpn.vpn

import android.app.Activity
import android.content.Intent
import android.net.VpnService
import android.net.Uri
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.net.Network
import android.net.TrafficStats
import android.provider.Settings
import android.util.Log
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * VpnBridgeModule — React Native native module bridging JS ↔ Kotlin.
 *
 * Exposes VPN lifecycle methods to the TypeScript layer and
 * emits status change events back to JavaScript.
 */
class VpnBridgeModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext),
    ActivityEventListener {

    companion object {
        private const val TAG = "VpnBridgeModule"
        private const val MODULE_NAME = "VpnBridgeModule"
        private const val VPN_PERMISSION_REQUEST = 1001

        private const val EVENT_STATUS_CHANGED = "VpnStatusChanged"
        private const val EVENT_ERROR = "VpnError"
        private const val PREFS_NAME = "kernelvpn_state"
        private const val PREF_APP_STATE = "persisted_state"
    }

    private var vpnPermissionPromise: Promise? = null
    private var networkCallback: ConnectivityManager.NetworkCallback? = null

    init {
        reactContext.addActivityEventListener(this)

        // Listen for status changes from PersonalVpnService
        PersonalVpnService.statusListener = { status ->
            emitStatusChanged(status)
        }
        PersonalVpnService.errorListener = { code, message ->
            emitError(code, message)
        }

        registerNetworkCallback()
    }

    override fun getName(): String = MODULE_NAME

    // -------------------------------------------------------------------------
    // React Native methods
    // -------------------------------------------------------------------------

    /**
     * Request VPN permission from the system.
     * Resolves with true if permission is granted, false if denied.
     */
    @ReactMethod
    fun requestPermission(promise: Promise) {
        try {
            val activity = currentActivity
            if (activity == null) {
                promise.reject("NO_ACTIVITY", "No current activity available")
                return
            }

            val prepareIntent = VpnService.prepare(activity)
            if (prepareIntent == null) {
                // Permission already granted
                Log.i(TAG, "VPN permission already granted")
                promise.resolve(true)
            } else {
                // Need to request permission
                vpnPermissionPromise = promise
                activity.startActivityForResult(prepareIntent, VPN_PERMISSION_REQUEST)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error requesting VPN permission", e)
            promise.reject("PERMISSION_ERROR", e.message, e)
        }
    }

    /**
     * Start the VPN service with profile and routing payload JSON.
     */
    @ReactMethod
    fun startVpn(startPayloadJson: String, promise: Promise) {
        try {
            val context = reactApplicationContext

            // Check permission first
            val prepareIntent = VpnService.prepare(context)
            if (prepareIntent != null) {
                promise.reject("NO_PERMISSION", "VPN permission not granted. Call requestPermission() first.")
                return
            }

            val serviceIntent = Intent(context, PersonalVpnService::class.java).apply {
                action = PersonalVpnService.ACTION_START
                putExtra(PersonalVpnService.EXTRA_START_PAYLOAD_JSON, startPayloadJson)
            }

            ContextCompat.startForegroundService(context, serviceIntent)
            Log.i(TAG, "VPN service start requested")
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "Error starting VPN", e)
            promise.reject("START_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun savePersistedState(stateJson: String, promise: Promise) {
        try {
            reactApplicationContext
                .getSharedPreferences(PREFS_NAME, android.content.Context.MODE_PRIVATE)
                .edit()
                .putString(PREF_APP_STATE, stateJson)
                .apply()
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "Error saving persisted state", e)
            promise.reject("PERSIST_SAVE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun loadPersistedState(promise: Promise) {
        try {
            val stateJson = reactApplicationContext
                .getSharedPreferences(PREFS_NAME, android.content.Context.MODE_PRIVATE)
                .getString(PREF_APP_STATE, null)
            promise.resolve(stateJson)
        } catch (e: Exception) {
            Log.e(TAG, "Error loading persisted state", e)
            promise.reject("PERSIST_LOAD_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun openBatteryOptimizationSettings(promise: Promise) {
        try {
            val context = reactApplicationContext
            val packageUri = Uri.parse("package:${context.packageName}")
            val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                data = packageUri
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            try {
                context.startActivity(intent)
            } catch (requestError: Exception) {
                val fallback = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                context.startActivity(fallback)
            }
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "Error opening battery optimization settings", e)
            promise.reject("BATTERY_SETTINGS_ERROR", e.message, e)
        }
    }

    /**
     * Stop the VPN service.
     */
    @ReactMethod
    fun stopVpn(promise: Promise) {
        try {
            val context = reactApplicationContext
            val serviceIntent = Intent(context, PersonalVpnService::class.java).apply {
                action = PersonalVpnService.ACTION_STOP
            }
            context.startService(serviceIntent)
            Log.i(TAG, "VPN service stop requested")
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping VPN", e)
            promise.reject("STOP_ERROR", e.message, e)
        }
    }

    /**
     * Get the current VPN status.
     */
    @ReactMethod
    fun getStatus(promise: Promise) {
        try {
            val status = PersonalVpnService.currentStatus.value
            promise.resolve(status)
        } catch (e: Exception) {
            promise.reject("STATUS_ERROR", e.message, e)
        }
    }

    /**
     * Get diagnostics information.
     */
    @ReactMethod
    fun getDiagnostics(promise: Promise) {
        try {
            val manager = DiagnosticsManager(reactApplicationContext)
            val result = manager.collect()

            val map = Arguments.createMap().apply {
                putBoolean("vpnPermissionGranted", result.vpnPermissionGranted)
                putBoolean("serviceRunning", result.serviceRunning)
                putBoolean("coreIntegrated", result.coreIntegrated)
                putBoolean("coreRunning", result.coreRunning)
                putString("activeProfileName", result.activeProfileName)
                putString("selectedProtocol", result.selectedProtocol)
                putString("deviceManufacturer", result.deviceManufacturer)
                putString("deviceModel", result.deviceModel)
                putString("androidVersion", result.androidVersion)
                putBoolean("wakeLockHeld", result.wakeLockHeld)
                putInt("underlyingNetworkCount", result.underlyingNetworkCount)
                putString("defaultInterfaceName", result.defaultInterfaceName)
                putString("defaultNetworkTransport", result.defaultNetworkTransport)
                putString("underlyingNetworkError", result.underlyingNetworkError)
                putString("splitTunnelMode", result.splitTunnelMode)
                putInt("splitTunnelRuleCount", result.splitTunnelRuleCount)
                putString("lastError", result.lastError)
                putString("lastCoreError", result.lastCoreError)
                putString("lastConnectionError", result.lastConnectionError)
                putString("batteryOptimizationWarning", result.batteryOptimizationWarning)
                putDouble("timestamp", result.timestamp.toDouble())
            }

            promise.resolve(map)
        } catch (e: Exception) {
            Log.e(TAG, "Error getting diagnostics", e)
            promise.reject("DIAGNOSTICS_ERROR", e.message, e)
        }
    }

    /**
     * Get list of installed launchable apps.
     */
    @ReactMethod
    fun getInstalledApps(promise: Promise) {
        try {
            val provider = InstalledAppsProvider(reactApplicationContext)
            val apps = provider.getLaunchableApps()

            val array = Arguments.createArray()
            for (app in apps) {
                val map = Arguments.createMap().apply {
                    putString("packageName", app.packageName)
                    putString("appName", app.appName)
                }
                array.pushMap(map)
            }

            promise.resolve(array)
        } catch (e: Exception) {
            Log.e(TAG, "Error getting installed apps", e)
            promise.reject("APPS_ERROR", e.message, e)
        }
    }

    // -------------------------------------------------------------------------
    // Activity result handling (VPN permission dialog)
    // -------------------------------------------------------------------------

    override fun onActivityResult(
        activity: Activity?,
        requestCode: Int,
        resultCode: Int,
        data: Intent?
    ) {
        if (requestCode == VPN_PERMISSION_REQUEST) {
            val granted = resultCode == Activity.RESULT_OK
            Log.i(TAG, "VPN permission result: granted=$granted")

            vpnPermissionPromise?.resolve(granted)
            vpnPermissionPromise = null

            if (!granted) {
                emitError("PERMISSION_DENIED", "User denied VPN permission")
            }
        }
    }

    override fun onNewIntent(intent: Intent?) {
        // Not used
    }

    // -------------------------------------------------------------------------
    // Event emission
    // -------------------------------------------------------------------------

    private fun emitStatusChanged(status: VpnStatus) {
        try {
            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(EVENT_STATUS_CHANGED, status.value)
        } catch (e: Exception) {
            Log.w(TAG, "Failed to emit status event", e)
        }
    }

    private fun emitError(code: String, message: String) {
        try {
            val errorMap = Arguments.createMap().apply {
                putString("code", code)
                putString("message", message)
            }
            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(EVENT_ERROR, errorMap)
        } catch (e: Exception) {
            Log.w(TAG, "Failed to emit error event", e)
        }
    }

    @ReactMethod
    fun getNetworkType(promise: Promise) {
        try {
            val connectivityManager = reactApplicationContext.getSystemService(android.content.Context.CONNECTIVITY_SERVICE) as ConnectivityManager
            val activeNetwork = connectivityManager.activeNetwork
            val capabilities = connectivityManager.getNetworkCapabilities(activeNetwork)
            if (capabilities == null) {
                promise.resolve("none")
                return
            }
            when {
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> promise.resolve("wifi")
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> promise.resolve("cellular")
                else -> promise.resolve("other")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting network type", e)
            promise.reject("NETWORK_TYPE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getTrafficStats(promise: Promise) {
        try {
            val rxBytes = TrafficStats.getTotalRxBytes().takeIf { it >= 0 } ?: 0L
            val txBytes = TrafficStats.getTotalTxBytes().takeIf { it >= 0 } ?: 0L
            val result = Arguments.createMap().apply {
                putDouble("rxBytes", rxBytes.toDouble())
                putDouble("txBytes", txBytes.toDouble())
                putDouble("timestampMs", System.currentTimeMillis().toDouble())
            }
            promise.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "Error getting traffic stats", e)
            promise.reject("TRAFFIC_STATS_ERROR", e.message, e)
        }
    }

    override fun invalidate() {
        super.invalidate()
        try {
            networkCallback?.let {
                val connectivityManager = reactApplicationContext.getSystemService(android.content.Context.CONNECTIVITY_SERVICE) as ConnectivityManager
                connectivityManager.unregisterNetworkCallback(it)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error unregistering network callback", e)
        }
    }

    private fun registerNetworkCallback() {
        try {
            val connectivityManager = reactApplicationContext.getSystemService(android.content.Context.CONNECTIVITY_SERVICE) as ConnectivityManager
            val request = NetworkRequest.Builder()
                .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                .build()

            networkCallback = object : ConnectivityManager.NetworkCallback() {
                private var lastNetworkType: String? = null

                override fun onCapabilitiesChanged(
                    network: Network,
                    networkCapabilities: NetworkCapabilities
                ) {
                    val currentType = when {
                        networkCapabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> "wifi"
                        networkCapabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> "cellular"
                        else -> "other"
                    }

                    if (currentType != lastNetworkType) {
                        lastNetworkType = currentType
                        emitNetworkTypeChanged(currentType)
                    }
                }

                override fun onLost(network: Network) {
                    val activeNet = connectivityManager.activeNetwork
                    val caps = connectivityManager.getNetworkCapabilities(activeNet)
                    val currentType = when {
                        caps == null -> "none"
                        caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> "wifi"
                        caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> "cellular"
                        else -> "other"
                    }
                    if (currentType != lastNetworkType) {
                        lastNetworkType = currentType
                        emitNetworkTypeChanged(currentType)
                    }
                }
            }

            connectivityManager.registerNetworkCallback(request, networkCallback!!)
        } catch (e: Exception) {
            Log.e(TAG, "Error registering network callback", e)
        }
    }

    private fun emitNetworkTypeChanged(networkType: String) {
        try {
            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("NetworkTypeChanged", networkType)
        } catch (e: Exception) {
            Log.w(TAG, "Failed to emit network type event", e)
        }
    }

    // -------------------------------------------------------------------------
    // Required for NativeEventEmitter on Android
    // -------------------------------------------------------------------------

    @ReactMethod
    fun addListener(eventName: String) {
        // Required for RN event emitter
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for RN event emitter
    }
}
