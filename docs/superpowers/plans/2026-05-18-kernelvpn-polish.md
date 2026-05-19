# KernelVPN Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a polished KernelVPN Android prototype with theme switching, safer Android defaults, parser improvements, tests, and a debug APK.

**Architecture:** Keep the existing React Native plus Kotlin bridge architecture. Add a small shared theme module and lightweight reusable UI components rather than introducing a design framework. Keep native package paths stable and only change visible product identity plus build/runtime safety settings.

**Tech Stack:** React Native 0.79, React 19, TypeScript, Jest, Android Gradle/Kotlin.

---

### Task 1: Baseline Tooling And Regression Tests

**Files:**
- Create: `.eslintrc.js`
- Create: `src/services/profileParser.test.ts`
- Create: `src/theme/theme.test.ts`
- Create: `src/theme/theme.ts`

- [ ] Add the ESLint config extending the local React Native rules.
- [ ] Add parser tests for VLESS, Trojan, Shadowsocks, VMess, invalid ports, and malformed links.
- [ ] Add theme tests for light/dark token selection and readable state colors.
- [ ] Run `npm test -- --runInBand` and confirm the new tests fail only where implementation is missing.

### Task 2: Protocol Parsing And Theme Core

**Files:**
- Modify: `src/services/profileParser.ts`
- Modify: `src/types/vpn.ts`
- Modify: `src/store/vpnStore.ts`
- Modify: `src/theme/theme.ts`

- [ ] Implement practical Trojan, Shadowsocks, and VMess parsing.
- [ ] Add theme mode to the in-memory store: `system`, `light`, `dark`.
- [ ] Add reusable theme token helpers for screens and status states.
- [ ] Run `npm test -- --runInBand`.

### Task 3: Apple-Like KernelVPN UI

**Files:**
- Modify: `App.tsx`
- Modify: `src/components/ActionRow.tsx`
- Modify: `src/components/ConnectionButton.tsx`
- Modify: `src/components/ServerCard.tsx`
- Modify: `src/components/StatusCard.tsx`
- Modify: `src/screens/HomeScreen.tsx`
- Modify: `src/screens/ImportProfileScreen.tsx`
- Modify: `src/screens/SplitTunnelingScreen.tsx`
- Modify: `src/screens/DiagnosticsScreen.tsx`

- [ ] Replace hardcoded dark colors with theme tokens.
- [ ] Rename visible UI copy to KernelVPN.
- [ ] Remove emoji icons in favor of restrained code-native glyphs/text.
- [ ] Add a theme toggle on the home screen.
- [ ] Add split-tunnel search and selected-count UX.
- [ ] Make diagnostics refresh on entry and present a compact checklist.

### Task 4: Android Stability, Branding, And Security

**Files:**
- Modify: `android/gradle.properties`
- Modify: `android/app/build.gradle`
- Modify: `android/app/src/main/AndroidManifest.xml`
- Modify: `android/app/src/main/res/values/strings.xml`
- Modify: `android/app/src/main/res/values/colors.xml`
- Modify: `android/app/src/main/res/drawable/ic_launcher_foreground.xml`
- Modify: `android/app/src/main/java/com/personalvpn/vpn/PersonalVpnService.kt`
- Modify: `android/app/src/main/java/com/personalvpn/vpn/VpnBridgeModule.kt`

- [ ] Set `newArchEnabled=false` to avoid the logged Android startup crash.
- [ ] Change visible app/service/notification strings to KernelVPN.
- [ ] Keep the VPN service non-exported.
- [ ] Disable broad cleartext traffic while retaining local dev domains in network security config.
- [ ] Update the adaptive icon foreground/background to a KernelVPN mark.

### Task 5: Verification And Build

**Commands:**
- `npm test -- --runInBand`
- `npm run lint`
- `npx tsc --noEmit`
- `npm audit --audit-level=high`
- `cd android && ./gradlew clean assembleDebug`

- [ ] Run all verification commands.
- [ ] Review Android manifest/native service for security-sensitive settings.
- [ ] Report APK path and any remaining limitations, especially real core routing.
