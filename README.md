# KernelVPN

Android React Native VPN client for private VLESS Reality usage. KernelVPN now
builds a sing-box config from the active profile, starts an embedded libbox core
inside `VpnService`, and only reports `Connected` after the core accepts the
config and opens the Android TUN interface.

This is still a debug/private build, not a store-ready release. Real routing was
compiled into the APK, but final tunnel behavior must be verified on physical
Samsung and OnePlus phones with your actual 3X-UI/VLESS Reality server.

## What Works

| Area | Status |
|---|---|
| VLESS Reality import and sing-box config generation | Implemented |
| VMess, Trojan, Shadowsocks config generation | Implemented at basic profile level |
| Embedded Android core runner | Implemented with libbox/sing-box AAR |
| Android `VpnService` TUN handoff | Implemented through libbox `openTun()` |
| Android underlying network handoff | Wi-Fi/cellular interface detection and default network monitor |
| Start/stop lifecycle | Implemented; no JS-side fake `Connected` fallback |
| Split tunneling | `all apps`, `selected only`, `all except selected` |
| Local persistence | Profiles, active profile, split rules, theme, panel settings |
| 3X-UI panel connection | API-based status, inbounds, VLESS import, Xray stop/restart |
| Diagnostics | VPN permission, service/core status, profile/protocol, errors, split mode, panel/Xray status |
| APK build | Debug APK via Gradle |

## Important Security Notes

- No real credentials are stored in source, tests, README, or snapshots.
- 3X-UI passwords/cookies are not logged by the app code.
- The Android network security config currently permits cleartext HTTP so a
  private 3X-UI panel can be tested over `http://...`.
- Prefer HTTPS or a reverse proxy with TLS before using this outside a trusted
  private network.
- The embedded libbox dependency is a prebuilt AAR:
  `net.clever-vpn:libbox-android:1.0.1`. For a release build, rebuild/vendor
  libbox from trusted sing-box/SFA sources and pin the artifact checksum.

## Architecture

```text
React Native UI
  -> vpnService / state persistence / sing-box config generator / 3X-UI API client
  -> NativeVpn.ts
  -> VpnBridgeModule.kt
  -> PersonalVpnService.kt
  -> CoreManager.kt
  -> libbox/sing-box
  -> Android VpnService TUN
```

Key files:

```text
src/services/singBoxConfig.ts
src/services/vpnStartPayload.ts
src/services/xuiPanelService.ts
src/services/diagnosticsService.ts
src/store/vpnStore.ts
src/screens/PanelScreen.tsx
src/screens/SplitTunnelingScreen.tsx
android/app/src/main/java/com/personalvpn/vpn/CoreManager.kt
android/app/src/main/java/com/personalvpn/vpn/PersonalVpnService.kt
android/app/src/main/java/com/personalvpn/vpn/DiagnosticsManager.kt
```

## Build

Requirements:

- Node.js 18+
- JDK 17
- Android SDK 35
- Android NDK 27.1
- Android device with API 26+
- arm64-v8a phone for the default debug APK

```bash
npm install
npx react-native bundle \
  --platform android \
  --dev false \
  --entry-file index.js \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res
cd android
./gradlew assembleDebug
```

APK path:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## Install On Phone

```bash
adb devices
adb uninstall com.kernelvpn || true
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb shell monkey -p com.kernelvpn 1
```

On Samsung/OnePlus, disable battery restrictions for KernelVPN during testing:

- App info -> Battery -> Unrestricted
- Allow VPN permission when Android asks
- Keep notifications allowed for the foreground service

## 3X-UI Panel Setup

In the app, open the 3X-UI panel screen and enter:

```text
Panel URL: http://panel.example:27390/base-path/
Username: demo-user
Password: demo-password
```

Use dummy values in examples and tests. Real panel access stays only on your
device.

The app uses 3X-UI API endpoints, not HTML parsing:

- `/login`
- `/panel/api/server/status`
- `/panel/api/inbounds/list`
- `/panel/api/server/restartXrayService`
- `/panel/api/server/stopXrayService`

The panel screen can test the connection, show Xray/server status, import VLESS
Reality clients from inbounds, and request Xray stop/restart.

## Phone Verification Checklist

1. Install the APK.
2. Open KernelVPN and import a real VLESS Reality profile from 3X-UI or paste a
   link manually.
3. Open Split Tunneling and choose:
   - `All apps` for a full-device test.
   - `Selected only` for one browser app.
   - `All except selected` to bypass a chosen app.
4. Tap Connect and grant Android VPN permission.
5. Open Diagnostics and confirm:
   - VPN Permission: Granted
   - VPN Service: Running
   - Core Integrated: Yes
   - VPN Core: Running
   - Active Profile and Protocol are correct
   - 3X-UI Panel is Connected if configured
   - Panel Xray is Running if the server is healthy
6. If a remote tester cannot capture `adb logcat`, ask them to open
   Diagnostics -> Share Diagnostics Report and send the generated text. The
   report includes device model, Android version, service/core state, split
   tunnel state, wake-lock state, battery warning, and last native/core error
   without exposing profile secrets.

The app should not show `Connected` if libbox rejects the config or fails to
open TUN. In that case, Diagnostics and logcat should show the core/connection
error.

## Check External IP

Before connecting:

```bash
adb shell am start -a android.intent.action.VIEW -d https://ifconfig.me
```

After connecting, open the same page in the phone browser. The public IP should
change to the VPN server or upstream egress IP.

Alternative checks:

- `https://ipinfo.io`
- `https://browserleaks.com/ip`
- `https://1.1.1.1/help`

## Check DNS Leaks

With VPN connected, test:

```text
https://browserleaks.com/dns
https://dnsleaktest.com
```

Expected result: DNS resolvers should belong to the VPN path or configured DNS,
not the mobile carrier/home ISP. If DNS leaks appear, capture logcat and test
`All apps` mode first, then selected-app mode.

## Check Split Tunneling

Selected-only test:

1. Set mode to `Selected only`.
2. Enable only Chrome or Samsung Internet.
3. Connect VPN.
4. Check IP in the selected browser.
5. Open a non-selected app and confirm it keeps direct connectivity.

All-except test:

1. Set mode to `All except selected`.
2. Select one browser to bypass.
3. Connect VPN.
4. The bypassed browser should show the normal/direct IP.
5. Other apps should use the VPN IP.

## Logcat

Clear logs and start the app:

```bash
adb logcat -c
adb shell monkey -p com.kernelvpn 1
```

Watch KernelVPN/libbox/VpnService logs:

```bash
adb logcat | grep -iE "KernelVPN|CoreManager|PersonalVpnService|VpnService|libbox|sing-box|AndroidRuntime|FATAL EXCEPTION"
```

If a connection fails, include these lines when debugging:

- `CoreManager`
- `PersonalVpnService`
- `VpnBridgeModule`
- `AndroidRuntime`
- `FATAL EXCEPTION`

If Chrome/Google shows offline immediately after connect, look for these
CoreManager lines:

- `Default interface for libbox: ...`
- `Providing ... Android network interfaces to libbox`
- No repeated `no available network interface`
- No DNS requests to `172.19.0.2:53` being sent through `outbound/vless`

KernelVPN routes internal TUN DNS traffic to sing-box `dns-out` by the
`172.19.0.2:53` destination, resolves with DoH/TCP instead of UDP, gives libbox
the real Wi-Fi/cellular interface list, uses a conservative 1500 TUN MTU with
IPv4+IPv6 TUN addresses, and blocks non-DNS UDP for VLESS Reality Vision
profiles so Chrome can fall back from QUIC to TCP. If the next failure is VLESS
Reality auth, SNI, public key, or server-side Reality settings, logcat should
show a different proxy/TLS error instead of a local Android routing error.

On OnePlus/OxygenOS, also disable battery optimization if Diagnostics shows the
Battery Warning row. OxygenOS may keep the status icon visible while throttling
or killing background VPN work. KernelVPN also holds a partial wake lock while
the VPN session is active; Diagnostics should show `Wake Lock: Held` during an
active connection.

Do not paste real VLESS links, UUIDs, panel cookies, or passwords into logs you
share.

## Known Limitations

- Physical routing is not verifiable in this desktop build environment; it must
  be tested on Samsung/OnePlus with `adb`.
- The libbox AAR is prebuilt and third-party packaged. Release builds should use
  a trusted pinned artifact or a locally built libbox AAR.
- The default debug APK is filtered to `arm64-v8a` for Samsung/OnePlus phones;
  remove the Gradle ABI filter if you need an x86_64 emulator build.
- Release signing is not configured.
- Domain-based routing and signed remote rules are not finished.
- VLESS Reality Vision is treated as TCP-first. Non-DNS UDP is blocked so
  browsers fall back from QUIC to TCP; use a UDP-capable profile/core path if
  you need UDP-heavy apps or games through the tunnel.
- Speedtest apps may still fail or under-report on this TCP-first VLESS Reality
  path because many of their tests prefer UDP. Browser IP checks are a better
  first verification target.
- DNS leak behavior depends on the server/profile and must be tested on-device.
- HTTP panel access is allowed for private testing; HTTPS is strongly preferred.

## Development Checks

```bash
npm test -- --runInBand
npm run lint
npx tsc --noEmit
npm audit --audit-level=high
git diff --check
cd android && ./gradlew assembleDebug
```

## License

Private project. Not for distribution.
