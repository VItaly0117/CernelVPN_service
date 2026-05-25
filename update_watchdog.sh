#!/bin/bash

# Add imports to PersonalVpnService.kt
sed -i '' 's/import android.os.PowerManager/import android.os.PowerManager\
import java.util.concurrent.Executors\
import java.util.concurrent.ScheduledExecutorService\
import java.util.concurrent.ScheduledFuture\
import java.util.concurrent.TimeUnit\
import java.net.InetAddress\
/' android/app/src/main/java/com/personalvpn/vpn/PersonalVpnService.kt

# Add watchdog fields
sed -i '' 's/private val mainHandler = Handler(Looper.getMainLooper())/private val mainHandler = Handler(Looper.getMainLooper())\
\
    private var watchdogExecutor: ScheduledExecutorService? = null\
    private var watchdogFuture: ScheduledFuture<*>? = null\
    private var consecutiveFailures = 0/' android/app/src/main/java/com/personalvpn/vpn/PersonalVpnService.kt

# Add start/stop watchdog methods
sed -i '' '/private fun stopVpnTunnel(stopSelfAfter: Boolean = true) {/i\
\
    private fun startWatchdog() {\
        stopWatchdog()\
        consecutiveFailures = 0\
        watchdogExecutor = Executors.newSingleThreadScheduledExecutor()\
        watchdogFuture = watchdogExecutor?.scheduleAtFixedRate({\
            if (!isServiceRunning || core?.isRunning() != true) return@scheduleAtFixedRate\
            runCatching {\
                val address = InetAddress.getByName("8.8.8.8")\
                val isReachable = address.isReachable(3000)\
                if (isReachable) {\
                    consecutiveFailures = 0\
                } else {\
                    consecutiveFailures++\
                    Log.w(TAG, "Watchdog: Ping to 8.8.8.8 failed (failures=$consecutiveFailures)")\
                    if (consecutiveFailures >= 3) {\
                        Log.e(TAG, "Watchdog: Connection lost, initiating reconnect")\
                        mainHandler.post {\
                            errorListener?.invoke("WATCHDOG_TIMEOUT", "Connection lost, please reconnect")\
                            stopVpnTunnel(stopSelfAfter = false)\
                        }\
                    }\
                }\
            }.onFailure { e ->\
                Log.w(TAG, "Watchdog error", e)\
            }\
        }, 15, 10, TimeUnit.SECONDS)\
        Log.i(TAG, "Watchdog started")\
    }\
\
    private fun stopWatchdog() {\
        watchdogFuture?.cancel(true)\
        watchdogFuture = null\
        watchdogExecutor?.shutdownNow()\
        watchdogExecutor = null\
    }\
' android/app/src/main/java/com/personalvpn/vpn/PersonalVpnService.kt

# Hook startWatchdog into startCoreAsync on success
sed -i '' 's/updateNotification("Connected")/updateNotification("Connected")\
                    startWatchdog()/' android/app/src/main/java/com/personalvpn/vpn/PersonalVpnService.kt

# Hook stopWatchdog into stopVpnTunnel
sed -i '' 's/updateStatus(VpnStatus.DISCONNECTING)/updateStatus(VpnStatus.DISCONNECTING)\
        stopWatchdog()/' android/app/src/main/java/com/personalvpn/vpn/PersonalVpnService.kt

