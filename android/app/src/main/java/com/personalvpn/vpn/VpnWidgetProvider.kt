package com.personalvpn.vpn

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import android.widget.RemoteViews
import com.personalvpn.R

class VpnWidgetProvider : AppWidgetProvider() {

    companion object {
        private const val TAG = "VpnWidgetProvider"
        const val ACTION_TOGGLE_VPN = "com.personalvpn.vpn.ACTION_TOGGLE_VPN"

        fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int,
            status: VpnStatus
        ) {
            val views = RemoteViews(context.packageName, R.layout.widget_vpn)

            when (status) {
                VpnStatus.CONNECTED -> {
                    views.setTextViewText(R.id.widget_status, "Connected")
                    // Change background logic depends on OS version, simplified for remote views
                    // The best way in older Android is to swap the view or set an image resource
                    // We'll use setImageViewResource for the background if it was an ImageView, 
                    // but it's a LinearLayout. We can use setInt(id, "setBackgroundResource", resId)
                    views.setInt(R.id.widget_container, "setBackgroundResource", R.drawable.widget_bg_connected)
                }
                VpnStatus.CONNECTING -> {
                    views.setTextViewText(R.id.widget_status, "Connecting...")
                    views.setInt(R.id.widget_container, "setBackgroundResource", R.drawable.widget_bg_disconnected)
                }
                else -> {
                    views.setTextViewText(R.id.widget_status, "Disconnected")
                    views.setInt(R.id.widget_container, "setBackgroundResource", R.drawable.widget_bg_disconnected)
                }
            }

            // Setup click intent
            val intent = Intent(context, VpnWidgetProvider::class.java).apply {
                action = ACTION_TOGGLE_VPN
            }
            val pendingIntent = PendingIntent.getBroadcast(
                context, 
                0, 
                intent, 
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_container, pendingIntent)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        val currentStatus = PersonalVpnService.currentStatus
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId, currentStatus)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        
        if (intent.action == ACTION_TOGGLE_VPN) {
            Log.i(TAG, "Widget toggle clicked")
            val isRunning = PersonalVpnService.isServiceRunning

            if (isRunning) {
                val stopIntent = Intent(context, PersonalVpnService::class.java).apply {
                    action = PersonalVpnService.ACTION_STOP
                }
                context.startService(stopIntent)
            } else {
                val prefs = context.getSharedPreferences("kernelvpn_state", Context.MODE_PRIVATE)
                val payload = prefs.getString("last_start_payload", null)

                if (payload.isNullOrBlank()) {
                    Log.w(TAG, "No cached payload, opening app")
                    val appIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
                    if (appIntent != null) {
                        appIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        context.startActivity(appIntent)
                    }
                    return
                }

                val startIntent = Intent(context, PersonalVpnService::class.java).apply {
                    action = PersonalVpnService.ACTION_START
                    putExtra(PersonalVpnService.EXTRA_START_PAYLOAD_JSON, payload)
                }

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(startIntent)
                } else {
                    context.startService(startIntent)
                }
            }
        }
    }
}
