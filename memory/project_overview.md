---
name: project_overview
description: Comprehensive overview of KernelVPN project features and implementation status
metadata:
  type: project
---

# KernelVPN Project Documentation

## What Works (Feature Implementation Status)

### Core VPN Functionality
- ✅ VLESS Reality import and sing-box config generation
- ✅ VMess, Trojan, Shadowsocks config generation (basic profile level)
- ✅ Embedded Android core runner with libbox/sing-box AAR
- ✅ Android VpnService TUN handoff through libbox `openTun()`
- ✅ Android underlying network handoff (Wi-Fi/cellular interface detection and default network monitor)
- ✅ Start/stop lifecycle (no JS-side fake `Connected` fallback)
- ✅ Split tunneling: `all apps`, `selected only`, `all except selected`
- ✅ Local persistence: Profiles, active profile, split rules, theme, panel settings
- ✅ 3X-UI panel connection: API-based status, inbounds, VLESS import, Xray stop/restart
- ✅ Diagnostics: VPN permission, service/core status, profile/protocol, errors, split mode, panel/Xray status
- ✅ APK build: Debug APK via Gradle

### Advanced Networking Features
- ✅ Network-aware split tunneling & instant handover (dual-network profiles for Wi-Fi/Cellular)
- ✅ Zero-delay handover when switching between network types
- ✅ DNS-level adblocker (AdGuard DNS-over-HTTPS when enabled)
- ✅ TUN DNS traffic routing to sing-box `dns-out` via DoH/TCP instead of UDP
- ✅ Non-DNS UDP blocking for VLESS Reality Vision profiles (forces QUIC->TCP fallback)
- ✅ IPv4+IPv6 TUN addresses with conservative 1500 MTU
- ✅ Real Wi-Fi/cellular interface list provided to libbox
- ✅ Traffic statistics service
- ✅ Wake lock holding during active VPN sessions

### UI/UX Features
- ✅ Premium Midnight Carbon & Electric Violet theme (glassmorphic UI)
- ✅ Animated Shield component with particle flow visualization
- ✅ Custom glassmorphic top-floating notification system
- ✅ Motion overlay animations
- ✅ Connection status badges and real-time telemetry
- ✅ Server card UI for remote server connections
- ✅ Traffic graph visualization
- ✅ Split tunneling screen with tabbed router (Apps, Domains, AppBlock, Settings)
- ✅ Import profile screen (config link parser and QR importer)
- ✅ Panel screen for 3X-UI management
- ✅ Diagnostics screen with shareable report generation
- ✅ Home screen as main dashboard with quick toggle
- ✅ ActionRow components for settings
- ✅ Custom notification system
- ✅ Error boundaries
- ✅ Connection button with state visualization

### Security & Privacy
- ✅ No real credentials stored in source, tests, README, or snapshots
- ✅ 3X-UI passwords/cookies not logged by app code
- ✅ Log sanitization for sensitive data (UUIDs, passwords, servers)
- ✅ Network security config permits cleartext HTTP for private 3X-UI testing
- ✅ Recommendation to use HTTPS/reverse proxy for production
- ✅ libbox dependency is prebuilt AAR (net.clever-vpn:libbox-android:1.0.1)
- ✅ Instructions for release builds to rebuild/vendor libbox from trusted sources
- ✅ Checksum pinning recommendation for libbox artifact

### 3X-UI Panel Integration
- ✅ API-based connection (not HTML parsing)
- ✅ Supported endpoints:
  - `/login`
  - `/panel/api/server/status`
  - `/panel/api/inbounds/list`
  - `/panel/api/server/restartXrayService`
  - `/panel/api/server/stopXrayService`
- ✅ Connection testing and status display
- ✅ Xray/server status monitoring
- ✅ VLESS Reality client import from inbounds
- ✅ Xray stop/restart requests
- ✅ Panel configuration persistence (URL, username, password, session cookie)

### Build & Deployment
- ✅ Requirements: Node.js 18+, JDK 17, Android SDK 35, Android NDK 27.1
- ✅ Debug APK build via Gradle (`./gradlew assembleDebug`)
- ✅ Asset bundling with React Native CLI
- ✅ Installation via ADB
- ✅ Battery optimization guidance for Samsung/OnePlus devices
- ✅ VPN permission handling instructions

### Development & Testing
- ✅ Jest unit tests (includes persistence sanitization verification)
- ✅ TypeScript compiler checking (`npx tsc --noEmit`)
- ✅ ESLint validation (`npm run lint`)
- ✅ npm audit with high severity level
- ✅ Git diff whitespace checking
- ✅ Debug build verification workflow

### Known Limitations (Documented)
- ❌ Physical routing not verifiable in desktop build (requires Samsung/OnePlus + adb)
- ❌ libbox AAR is prebuilt third-party (release builds should use trusted pinned artifact)
- ❌ Default debug APK filtered to arm64-v8a (remove Gradle ABI filter for x86_64 emulator)
- ❌ Release signing not configured
- ❌ Domain-based routing and signed remote rules not finished
- ❌ VLESS Reality Vision treated as TCP-first (UDP blocked for Chrome fallback)
- ❌ Speedtest apps may fail/under-report due to TCP-first path
- ❌ DNS leak behavior depends on server/profile (must test on-device)
- ❌ HTTP panel access allowed for testing; HTTPS strongly preferred

## Key Files Implemented

### React Native Layer (TypeScript/TSX)
- `src/services/singBoxConfig.ts` - Sing-box JSON configuration generator
- `src/services/vpnStartPayload.ts` - Payload compilation for Kotlin bridge
- `src/services/xuiPanelService.ts` - 3X-UI panel API client
- `src/services/diagnosticsService.ts` - Diagnostics collection and reporting
- `src/store/vpnStore.ts` - Reactive state management (MMKV-backed)
- `src/types/vpn.ts` - TypeScript interfaces and enums
- `src/screens/HomeScreen.tsx` - Main dashboard
- `src/screens/SplitTunnelingScreen.tsx` - Split tunneling configuration
- `src/screens/PanelScreen.tsx` - 3X-UI panel management
- `src/screens/DiagnosticsScreen.tsx` - System diagnostics and reporting
- `src/screens/ImportProfileScreen.tsx` - Profile import via links/QR
- `src/components/AnimatedShield.tsx` - Premium connection visualization
- `src/components/CustomNotification.tsx` - Glassmorphic toast notifications
- `src/components/ConnectionButton.tsx` - Main connect/disconnect button
- `src/components/StatusCard.tsx` - Real-time telemetry display
- `src/components/TrafficGraph.tsx` - Network traffic visualization
- `src/theme/theme.ts` - Design tokens and HSL color system
- `src/native/NativeVpn.ts` - Native module bridge definition

### Native Android Layer (Kotlin)
- `android/app/src/main/java/com/personalvpn/vpn/CoreManager.kt` - Libbox/core integration and TUN bridging
- `android/app/src/main/java/com/personalvpn/vpn/PersonalVpnService.kt` - Foreground VPN service
- `android/app/src/main/java/com/personalvpn/vpn/VpnBridgeModule.kt` - React Native bridge module
- `android/app/src/main/java/com/personalvpn/vpn/VpnTileService.kt` - Quick Settings tile
- `android/app/src/main/java/com/personalvpn/vpn/DiagnosticsManager.kt` - Native diagnostics collection

### Configuration & Build
- `android/app/src/main/AndroidManifest.xml` - Service and tile declarations
- `index.js` - React Native entry point
- `app.json` - Expo/configuration
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `metro.config.js` - Metro bundler configuration
- `babel.config.js` - Babel presets
- `DOCUMENTATION.md` - Detailed architecture documentation
- `README.md` - User-facing documentation and setup guide

## Architecture Highlights

### Split-Layer Hybrid Architecture
1. **React Native Layer**: Presentation and state management
2. **Native Android Layer**: Kotlin service wrapping Sing-box via custom bridge
3. **System Network Layer**: libbox TUN interface handling traffic routing

### Native Bridge Protocol
- JSON payload serialization for configuration transfer
- Asynchronous event emission for status updates
- Foreground service lifecycle management
- Network change detection and seamless handover

### Premium UI/UX Implementation
- Glassmorphic design with blur effects
- Animated vector components (Shield, particle flows)
- Physics-based animations (spring configurations)
- Custom notification system replacing basic Android toasts
- Theme system using HSL color values for consistency

## Current Development Focus
Based on recent git branches and APK builds, the user appears to be working on:
- Premium UX enhancements (`KernelVPN-PremiumUX-Debug.apk`)
- Routing fixes (`KernelVPN-RoutingFix-Debug.apk`)
- DNS fixes (`KernelVPN-DNSFix-Debug.apk`)
- New aesthetics (`KernelVPN-NewAesthetics-Debug.apk`)
- Filter improvements (`KernelVPN-Filters-Debug.apk`)
- Royal Shield release (`KernelVPN-RoyalShield-v0.4.0-9aca001-OfflineRelease.apk`)

The project is in an advanced state with core functionality implemented and various polishing/refinement branches active.