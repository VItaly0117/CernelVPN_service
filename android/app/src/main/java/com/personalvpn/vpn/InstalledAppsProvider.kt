package com.personalvpn.vpn

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.util.Log

/**
 * InstalledAppsProvider — Retrieves launchable apps from the system.
 *
 * Used for split tunneling UI: shows apps the user can include/exclude from VPN.
 */
class InstalledAppsProvider(private val context: Context) {

    companion object {
        private const val TAG = "InstalledAppsProvider"
    }

    data class AppInfo(
        val packageName: String,
        val appName: String
    )

    /**
     * Get all launchable (user-facing) apps.
     * Excludes system apps that don't have a launcher activity.
     */
    fun getLaunchableApps(): List<AppInfo> {
        return try {
            val pm = context.packageManager
            val mainIntent = Intent(Intent.ACTION_MAIN, null).apply {
                addCategory(Intent.CATEGORY_LAUNCHER)
            }

            val activities = pm.queryIntentActivities(mainIntent, 0)
            val seen = mutableSetOf<String>()

            activities
                .mapNotNull { resolveInfo ->
                    val pkgName = resolveInfo.activityInfo.packageName
                    if (pkgName != null && seen.add(pkgName)) {
                        val appName = try {
                            resolveInfo.loadLabel(pm).toString()
                        } catch (e: Exception) {
                            pkgName
                        }
                        AppInfo(packageName = pkgName, appName = appName)
                    } else {
                        null
                    }
                }
                .sortedBy { it.appName.lowercase() }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get installed apps", e)
            emptyList()
        }
    }
}
