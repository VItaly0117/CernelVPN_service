package com.personalvpn.vpn

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.util.Log
import java.io.File
import java.io.FileOutputStream

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
        val appName: String,
        val iconBase64: String?
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
            
            // Setup local app icons cache directory
            val cacheDir = File(context.cacheDir, "app_icons").apply {
                if (!exists()) {
                    mkdirs()
                }
            }

            activities
                .mapNotNull { resolveInfo ->
                    val pkgName = resolveInfo.activityInfo.packageName
                    if (pkgName != null && pkgName != context.packageName && seen.add(pkgName)) {
                        val appName = try {
                            resolveInfo.loadLabel(pm).toString()
                        } catch (e: Exception) {
                            pkgName
                        }

                        // Save drawable lazily to PNG cache to avoid serialization bridge delays
                        val iconFile = File(cacheDir, "${pkgName}.png")
                        if (!iconFile.exists()) {
                            try {
                                val drawable = resolveInfo.loadIcon(pm)
                                val bitmap = if (drawable is BitmapDrawable) {
                                    drawable.bitmap
                                } else {
                                    val width = if (drawable.intrinsicWidth > 0) drawable.intrinsicWidth else 96
                                    val height = if (drawable.intrinsicHeight > 0) drawable.intrinsicHeight else 96
                                    val bmp = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
                                    val canvas = Canvas(bmp)
                                    drawable.setBounds(0, 0, canvas.width, canvas.height)
                                    drawable.draw(canvas)
                                    bmp
                                }
                                val resized = Bitmap.createScaledBitmap(bitmap, 96, 96, true)
                                FileOutputStream(iconFile).use { out ->
                                    resized.compress(Bitmap.CompressFormat.PNG, 100, out)
                                }
                            } catch (e: Exception) {
                                Log.e(TAG, "Failed to save icon for $pkgName", e)
                            }
                        }

                        val iconUri = if (iconFile.exists()) "file://${iconFile.absolutePath}" else null

                        AppInfo(packageName = pkgName, appName = appName, iconBase64 = iconUri)
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
