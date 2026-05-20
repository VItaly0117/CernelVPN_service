package com.personalvpn.vpn

import android.content.Context
import android.content.Intent
import android.net.VpnService
import android.os.Build
import android.service.quicksettings.Tile
import android.service.quicksettings.TileService
import android.util.Log

class VpnTileService : TileService() {

    companion object {
        private const val TAG = "VpnTileService"
    }

    override fun onStartListening() {
        super.onStartListening()
        Log.d(TAG, "onStartListening")
        updateTile()
    }

    override fun onClick() {
        super.onClick()
        Log.d(TAG, "onClick")
        
        val isRunning = PersonalVpnService.isServiceRunning
        val status = PersonalVpnService.currentStatus

        if (isRunning && status == VpnStatus.CONNECTED) {
            // Stop VPN
            val intent = Intent(this, PersonalVpnService::class.java).apply {
                action = PersonalVpnService.ACTION_STOP
            }
            startService(intent)
        } else {
            // Start VPN
            // First check if VPN permission is granted
            val prepareIntent = VpnService.prepare(this)
            if (prepareIntent != null) {
                // We need permission. We must open the app.
                val appIntent = packageManager.getLaunchIntentForPackage(packageName)
                if (appIntent != null) {
                    appIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                        val pendingIntent = android.app.PendingIntent.getActivity(
                            this,
                            0,
                            appIntent,
                            android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_IMMUTABLE
                        )
                        startActivityAndCollapse(pendingIntent)
                    } else {
                        @Suppress("DEPRECATION")
                        startActivityAndCollapse(appIntent)
                    }
                }
            } else {
                // Permission is already granted! We can read the last successful payload and start.
                val prefs = getSharedPreferences("kernelvpn_state", Context.MODE_PRIVATE)
                val lastPayload = prefs.getString("last_start_payload", null)
                if (!lastPayload.isNullOrBlank()) {
                    val intent = Intent(this, PersonalVpnService::class.java).apply {
                        action = PersonalVpnService.ACTION_START
                        putExtra(PersonalVpnService.EXTRA_START_PAYLOAD_JSON, lastPayload)
                    }
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        startForegroundService(intent)
                    } else {
                        startService(intent)
                    }
                } else {
                    // No cached payload, we must open the main app so the user can import a profile
                    val appIntent = packageManager.getLaunchIntentForPackage(packageName)
                    if (appIntent != null) {
                        appIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                            val pendingIntent = android.app.PendingIntent.getActivity(
                                this,
                                0,
                                appIntent,
                                android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_IMMUTABLE
                            )
                            startActivityAndCollapse(pendingIntent)
                        } else {
                            @Suppress("DEPRECATION")
                            startActivityAndCollapse(appIntent)
                        }
                    }
                }
            }
        }
        
        // Brief delay before updating to let status transition
        updateTile()
    }

    private fun updateTile() {
        val tile = qsTile ?: return
        val status = PersonalVpnService.currentStatus

        Log.d(TAG, "updateTile: status=${status.value}")

        when (status) {
            VpnStatus.CONNECTED -> {
                tile.state = Tile.STATE_ACTIVE
                tile.label = PersonalVpnService.currentActiveProfileName ?: "KernelVPN"
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    tile.subtitle = "Connected"
                }
            }
            VpnStatus.CONNECTING -> {
                tile.state = Tile.STATE_INACTIVE
                tile.label = "KernelVPN"
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    tile.subtitle = "Connecting…"
                }
            }
            VpnStatus.DISCONNECTING -> {
                tile.state = Tile.STATE_INACTIVE
                tile.label = "KernelVPN"
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    tile.subtitle = "Disconnecting…"
                }
            }
            VpnStatus.ERROR -> {
                tile.state = Tile.STATE_INACTIVE
                tile.label = "KernelVPN"
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    tile.subtitle = "Connection Error"
                }
            }
            else -> {
                tile.state = Tile.STATE_INACTIVE
                tile.label = "KernelVPN"
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    tile.subtitle = "Disconnected"
                }
            }
        }

        tile.updateTile()
    }
}
