# KernelVPN - Technical Documentation & Debugging Guide

This document provides a comprehensive technical overview of the `KernelVPN` project, specifically prepared for advanced AI assistants (like Claude) to quickly onboard and debug persistent networking issues on Android 14 (OnePlus) and Android 16 (Samsung).

## Architecture Overview

The application is a React Native app with a heavily customized Android native layer that utilizes `sing-box` (via the `libbox-android` wrapper) as the core VPN engine.

**Flow:**
`React Native UI` -> `vpnService.ts` -> `NativeVpn.ts` (Bridge) -> `VpnBridgeModule.kt` -> `PersonalVpnService.kt` -> `CoreManager.kt` -> `libbox (sing-box)`

---

## 1. TypeScript Layer (React Native)

### `src/services/singBoxConfig.ts`
**Purpose:** Generates the raw JSON configuration for `sing-box` based on the user's selected profile and settings.
**Key Functions:**
- `buildTunInbound()`: Configures the virtual TUN interface. 
  * **Recent Fixes:** `mtu` is set to `9000` (to avoid cellular fragmentation), `stack` is set to `'mixed'`, and IPv6 addresses were removed to prevent blackholing on ISPs lacking IPv6 support.
- `buildVlessOutbound()` / `buildTrojanOutbound()`: Generates proxy nodes. Note that the `network` property inside VLESS outbounds was recently removed because it is deprecated in newer `sing-box` cores.

### `src/services/vpnService.ts`
**Purpose:** Orchestrates the connection payload. It gathers split tunneling rules, parses the active profile, merges it into a JSON string using `singBoxConfig.ts`, and sends it to the Native module.

### `src/store/vpnStore.ts`
**Purpose:** Zustand-based state manager. Tracks `vpnState` (`DISCONNECTED`, `CONNECTING`, `CONNECTED`, etc.), error logs, split tunneling configurations, and theme settings.

### `src/services/profileParser.ts`
**Purpose:** Parses standard VPN links (e.g., `vless://uuid@host:port?...`).

---

## 2. Android Native Layer (Kotlin)

### `android/app/src/main/java/com/personalvpn/vpn/CoreManager.kt`
**Purpose:** The execution engine and the interface to `libbox`. Implements `io.nekohasekai.libbox.PlatformInterface`.
**Critical Responsibilities:**
- `openTun()`: Called by `libbox` to establish the TUN interface. It reads `TunOptions` provided by `sing-box` and configures Android's `VpnService.Builder`.
- **Underlying Networks:** The method `applyUnderlyingNetworks()` configures which physical network (Wi-Fi/Cellular) the VPN binds to. 
  * **Important Note:** We recently changed `builder.setUnderlyingNetworks(null)` to let Android OS auto-route traffic. Explicitly binding to network arrays caused severe "blackhole" bugs on OnePlus (OxygenOS) devices.
- **DNS / Routing:** Fallback DNS is set to `172.19.0.2` if `libbox` doesn't provide one. Routes are added automatically if `auto_route` is true in `singBoxConfig.ts`.

### `android/app/src/main/java/com/personalvpn/vpn/PersonalVpnService.kt`
**Purpose:** Android `VpnService` implementation.
**Critical Responsibilities:**
- Runs as a Foreground Service (`FOREGROUND_SERVICE_TYPE_SPECIAL_USE` for Android 14+).
- Holds an indefinite `WakeLock` to prevent custom OEM skins (OnePlus/Samsung) from killing the VPN process in the background.
- Instantiates `CoreManager` and manages the asynchronous startup of the `sing-box` core.

### `android/app/src/main/java/com/personalvpn/vpn/VpnBridgeModule.kt`
**Purpose:** The JNI Bridge connecting React Native (`NativeModules.NativeVpn`) to the Kotlin backend.
**Critical Responsibilities:**
- Emits events (`VPN_STATUS_CHANGED`, `VPN_ERROR`) back to the JS thread.
- Requests `VpnService.prepare()` permissions natively.

---

## 3. Persistent Bugs & Context for Claude

The user reports that the VPN successfully transitions to `CONNECTED`, but **no traffic flows (blackhole)**, specifically on OnePlus (Android 14) and potentially Samsung (Android 16).

If the latest APK still exhibits this issue, please investigate the following vectors:

1. **Split Tunneling on Custom ROMs:**
   In `CoreManager.kt`, `applyPackageRules()` calls `builder.addDisallowedApplication(packageName)`. On some versions of OxygenOS/ColorOS, `addDisallowedApplication` completely breaks the `VpnService` routing table, resulting in all traffic being dropped.
   * *Suggestion:* Try completely removing package filtering (`excludePackages` / `includePackages`) to see if traffic resumes.

2. **MTU / PMTUD Issues:**
   We set `mtu: 9000` in `singBoxConfig.ts` to rely on PMTUD. If the user's cellular provider drops ICMP packets, PMTUD fails. 
   * *Suggestion:* Try dropping TUN `mtu` to `1280` or `1350` to guarantee packet sizes fit within standard cellular constraints without fragmentation.

3. **Android 16 `setUnderlyingNetworks`:**
   While passing `null` to `setUnderlyingNetworks` is safe on stock Android, Android 16 (Samsung) or Android 14 (OnePlus) might have aggressive Multi-Network management that blocks traffic if the VPN doesn't explicitly bind to a network with `NET_CAPABILITY_VALIDATED`.

4. **libbox Version & Config Compatibility:**
   The app uses `net.clever-vpn:libbox-android:1.0.1`. If the internal `sing-box` core version is older (e.g., < 1.9.0), recent JSON schema changes might be silently ignored or cause undefined behavior in routing.

5. **Permissions & Battery Optimization:**
   On OnePlus, VPNs often require being whitelisted in "App Battery Management" (set to "Don't Optimize"). If the user hasn't done this, OxygenOS freezes the `libbox` socket threads immediately after screen lock.

**Good luck, Claude!**
