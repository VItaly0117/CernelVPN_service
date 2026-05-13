# Personal VPN — Android VPN Client Skeleton

An Android-only React Native application providing a clean technical foundation
for a personal VPN client. Supports importing proxy/VPN protocol links
(VLESS/REALITY, with future VMess, Trojan, Shadowsocks support) and managing
connections through an Android VpnService.

> **Stage:** MVP skeleton — no real traffic routing yet. The VPN tunnel interface
> is established, the foreground service runs, and the system VPN indicator
> appears, but traffic is not forwarded through a proxy core.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  React Native UI                     │
│  HomeScreen · ImportProfile · SplitTunneling · Diag  │
├─────────────────────────────────────────────────────┤
│              TypeScript Service Layer                │
│  vpnService · profileParser · rulesService · store   │
├─────────────────────────────────────────────────────┤
│         NativeVpn.ts  (NativeModules bridge)         │
├══════════════════════════════════════════════════════╡
│         VpnBridgeModule.kt  (React Native ↔ Kotlin)  │
├─────────────────────────────────────────────────────┤
│                  Android Native Layer                │
│  PersonalVpnService · CoreManager · ConfigWriter     │
│  InstalledAppsProvider · DiagnosticsManager           │
└─────────────────────────────────────────────────────┘
```

### File Structure

```
src/
  native/NativeVpn.ts             — JS → Kotlin bridge wrapper
  types/vpn.ts                    — TypeScript types
  services/
    vpnService.ts                 — High-level VPN orchestration
    profileParser.ts              — Protocol link parser (VLESS)
    rulesService.ts               — Remote rules manifest
    diagnosticsService.ts         — Diagnostics data fetching
  store/vpnStore.ts               — In-memory reactive state store
  screens/
    HomeScreen.tsx                 — Main VPN control screen
    ImportProfileScreen.tsx        — Paste & parse VPN links
    SplitTunnelingScreen.tsx       — Per-app VPN routing
    DiagnosticsScreen.tsx          — Service health check
  components/
    ConnectionButton.tsx           — Connect/disconnect button
    StatusCard.tsx                 — VPN status display
    ServerCard.tsx                 — Active profile info
    ActionRow.tsx                  — Navigation row component

android/app/src/main/java/com/personalvpn/
  MainApplication.kt              — RN app with VpnBridgePackage
  MainActivity.kt                 — RN activity
  vpn/
    VpnBridgeModule.kt            — Native module (JS bridge)
    VpnBridgePackage.kt           — Module registration
    PersonalVpnService.kt         — Android VpnService
    VpnStatus.kt                  — Status enum
    CoreManager.kt                — Proxy core stub
    ConfigWriter.kt               — Config file writer stub
    InstalledAppsProvider.kt       — Launchable apps list
    DiagnosticsManager.kt         — Health diagnostics
```

---

## What's Implemented (v0.1.0)

| Feature | Status |
|---|---|
| React Native project structure | ✅ |
| TypeScript types (VpnStatus, VpnProfile, etc.) | ✅ |
| NativeModules bridge (JS ↔ Kotlin) | ✅ |
| Home screen with connect button | ✅ |
| Import profile screen (VLESS parser) | ✅ |
| Split tunneling screen (UI + mode toggle) | ✅ |
| Diagnostics screen | ✅ |
| Android VpnService skeleton | ✅ |
| Foreground service + notification | ✅ |
| VPN permission request flow | ✅ |
| System VPN indicator | ✅ |
| Status events (Kotlin → JS) | ✅ |
| VLESS link parser | ✅ |
| CoreManager stub | ✅ |
| ConfigWriter stub | ✅ |
| Installed apps provider | ✅ |
| Split tunneling preparation (addAllowed/Disallowed) | ✅ |
| Remote rules service (mock) | ✅ |
| In-memory state store | ✅ |

## What's NOT Implemented Yet

| Feature | Notes |
|---|---|
| Real traffic routing via Xray/sing-box | CoreManager is a stub |
| VMess/Trojan/Shadowsocks parsers | Only VLESS is implemented |
| Persistent storage | In-memory only |
| Ed25519 signature verification for rules | TODO in rulesService |
| Domain-based routing | Needs core integration |
| Real split tunneling | Rules are prepared, not applied to Builder |
| Battery optimization prompt | Warning shown but no action |

---

## Quick Start

### Prerequisites

- Node.js ≥ 18
- Android SDK (API 35)
- Android NDK 27.1
- JDK 17
- An Android device or emulator (API 26+)

### Setup

```bash
# 1. Install JS dependencies
npm install

# 2. Initialize Gradle wrapper (if not present)
cd android
gradle wrapper --gradle-version 8.12
cd ..

# 3. Start Metro bundler
npm start

# 4. Build and run on device/emulator (in another terminal)
npm run android
```

### Build APK Only

```bash
cd android
./gradlew assembleDebug
# APK will be at: android/app/build/outputs/apk/debug/app-debug.apk
```

---

## How to Verify the VPN Service

1. Install the debug APK on your Android device.
2. Open the app — you'll see the Home screen.
3. Import a demo VLESS link:
   ```
   vless://00000000-0000-0000-0000-000000000000@example.com:443?type=tcp&security=reality&pbk=DEMO_PUBLIC_KEY&sni=example.com&sid=abcdef&flow=xtls-rprx-vision#DemoProfile
   ```
4. Tap **Connect** — the system will ask for VPN permission.
5. Grant the permission.
6. Observe:
   - 🔑 System VPN key icon appears in the status bar
   - 📢 Persistent "Personal VPN — Connected" notification
   - App shows "Connected" status with green indicator
7. Tap **Disconnect** to stop the service.
8. Check **Diagnostics** to verify service state.

> ⚠️ No real traffic is routed through the VPN in this version.
> The TUN interface is created but no proxy core processes traffic.

---

## Future Milestones

1. **sing-box core integration** — Replace CoreManager stub with real sing-box binary,
   pass TUN fd, route traffic through proxy.
2. **Full VLESS/REALITY support** — Generate proper sing-box configs from parsed profiles.
3. **Additional protocols** — VMess, Trojan, Shadowsocks parsers and config generation.
4. **Split tunneling** — Apply stored rules to VpnService.Builder on each connect.
5. **Persistent storage** — AsyncStorage or MMKV for profiles, rules, preferences.
6. **Remote signed rules** — Ed25519 signature verification for rule manifests.
7. **Diagnostics improvements** — Battery optimization prompt, core health monitoring.
8. **OnePlus stability checklist** — Test background service persistence,
   battery optimization whitelisting, wake locks if needed.

---

## Security Model

- System VPN indicator is **always shown** (never hidden).
- No detection bypass logic.
- Split tunneling uses standard `addAllowedApplication` / `addDisallowedApplication`.
- No real server credentials in source code — demo/mock data only.
- Remote updates are JSON rules only — no code execution.
- Future: Ed25519 signature verification for all remote manifests.

---

## License

Private project. Not for distribution.
