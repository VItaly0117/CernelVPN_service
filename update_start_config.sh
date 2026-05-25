#!/bin/bash
# Script to update Kotlin code for Phase 2 features

# Add killSwitchEnabled to StartConfig and static variables in PersonalVpnService
sed -i '' 's/var currentSelectedProtocol: String? = null/var currentSelectedProtocol: String? = null\
            private set\
\
        @Volatile\
        var currentKillSwitchEnabled: Boolean = false/' android/app/src/main/java/com/personalvpn/vpn/PersonalVpnService.kt

sed -i '' 's/currentSelectedProtocol = startConfig.protocol/currentSelectedProtocol = startConfig.protocol\
                currentKillSwitchEnabled = startConfig.killSwitchEnabled/' android/app/src/main/java/com/personalvpn/vpn/PersonalVpnService.kt

sed -i '' 's/val protocol: String?/val protocol: String?,\
        val killSwitchEnabled: Boolean/' android/app/src/main/java/com/personalvpn/vpn/PersonalVpnService.kt

sed -i '' 's/protocol = profile?.optString("protocol")?.takeIf { it.isNotBlank() }/protocol = profile?.optString("protocol")?.takeIf { it.isNotBlank() },\
                killSwitchEnabled = payload.optBoolean("killSwitchEnabled", false)/' android/app/src/main/java/com/personalvpn/vpn/PersonalVpnService.kt

sed -i '' 's/protocol = null/protocol = null,\
                killSwitchEnabled = false/' android/app/src/main/java/com/personalvpn/vpn/PersonalVpnService.kt

# Add setBlocking in CoreManager
sed -i '' 's/val builder = service.Builder()/val builder = service.Builder()\
\
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q \&\& PersonalVpnService.currentKillSwitchEnabled) {\
                    builder.setBlocking(true)\
                    Log.i(TAG, "VPN Kill Switch (blocking mode) enabled")\
                }/' android/app/src/main/java/com/personalvpn/vpn/CoreManager.kt

