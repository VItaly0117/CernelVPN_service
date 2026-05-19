package com.personalvpn.vpn

import android.content.Context
import android.os.Build
import android.os.PowerManager
import android.util.Log

/**
 * DiagnosticsManager — Collects VPN service health information.
 */
class DiagnosticsManager(private val context: Context) {

    companion object {
        private const val TAG = "DiagnosticsManager"
    }

    data class DiagnosticResult(
        val vpnPermissionGranted: Boolean,
        val serviceRunning: Boolean,
        val coreIntegrated: Boolean,
        val coreRunning: Boolean,
        val activeProfileName: String?,
        val selectedProtocol: String?,
        val deviceManufacturer: String,
        val deviceModel: String,
        val androidVersion: String,
        val splitTunnelMode: String,
        val splitTunnelRuleCount: Int,
        val lastError: String?,
        val lastCoreError: String?,
        val lastConnectionError: String?,
        val batteryOptimizationWarning: String?,
        val timestamp: Long
    )

    /**
     * Collect a diagnostics snapshot.
     */
    fun collect(): DiagnosticResult {
        val vpnPermission = checkVpnPermission()
        val serviceRunning = PersonalVpnService.isServiceRunning
        val lastCoreError = PersonalVpnService.coreManager?.getLastError()
            ?: CoreManager.getLibboxSetupError()
        val coreIntegrated = PersonalVpnService.coreManager?.isCoreIntegrated()
            ?: CoreManager.isLibboxAvailable()
        val coreRunning = PersonalVpnService.coreManager?.isRunning() ?: false
        val activeProfileName = PersonalVpnService.currentActiveProfileName
        val selectedProtocol = PersonalVpnService.currentSelectedProtocol
        val splitTunnelMode = PersonalVpnService.currentSplitTunnelMode
        val splitTunnelRuleCount = PersonalVpnService.currentSplitTunnelRuleCount
        val lastConnectionError = PersonalVpnService.lastConnectionError
        val lastError = lastConnectionError ?: lastCoreError
        val batteryWarning = checkBatteryOptimization()

        val result = DiagnosticResult(
            vpnPermissionGranted = vpnPermission,
            serviceRunning = serviceRunning,
            coreIntegrated = coreIntegrated,
            coreRunning = coreRunning,
            activeProfileName = activeProfileName,
            selectedProtocol = selectedProtocol,
            deviceManufacturer = Build.MANUFACTURER ?: "unknown",
            deviceModel = Build.MODEL ?: "unknown",
            androidVersion = "Android ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})",
            splitTunnelMode = splitTunnelMode,
            splitTunnelRuleCount = splitTunnelRuleCount,
            lastError = lastError,
            lastCoreError = lastCoreError,
            lastConnectionError = lastConnectionError,
            batteryOptimizationWarning = batteryWarning,
            timestamp = System.currentTimeMillis()
        )

        Log.d(TAG, "Diagnostics: $result")
        return result
    }

    /**
     * Check if VPN permission is currently available.
     */
    private fun checkVpnPermission(): Boolean {
        return try {
            val intent = android.net.VpnService.prepare(context)
            // If prepare() returns null, permission is already granted
            intent == null
        } catch (e: Exception) {
            Log.w(TAG, "Error checking VPN permission", e)
            false
        }
    }

    /**
     * Check if the app is affected by battery optimization.
     */
    private fun checkBatteryOptimization(): String? {
        return try {
            val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
            if (!pm.isIgnoringBatteryOptimizations(context.packageName)) {
                "Battery optimization is enabled. This may cause the VPN service to be killed in the background. Consider disabling battery optimization for this app."
            } else {
                null
            }
        } catch (e: Exception) {
            Log.w(TAG, "Error checking battery optimization", e)
            null
        }
    }
}
