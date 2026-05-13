package com.personalvpn.vpn

import android.content.Context
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
        val coreRunning: Boolean,
        val lastError: String?,
        val batteryOptimizationWarning: String?,
        val timestamp: Long
    )

    /**
     * Collect a diagnostics snapshot.
     */
    fun collect(): DiagnosticResult {
        val vpnPermission = checkVpnPermission()
        val serviceRunning = PersonalVpnService.isServiceRunning
        val coreRunning = PersonalVpnService.coreManager?.isRunning() ?: false
        val lastError = PersonalVpnService.coreManager?.getLastError()
        val batteryWarning = checkBatteryOptimization()

        val result = DiagnosticResult(
            vpnPermissionGranted = vpnPermission,
            serviceRunning = serviceRunning,
            coreRunning = coreRunning,
            lastError = lastError,
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
