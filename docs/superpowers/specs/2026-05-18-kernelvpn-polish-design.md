# KernelVPN Polish Design

## Goal

Turn the current Android VPN skeleton into a polished KernelVPN prototype with an Apple-like light interface, a dark theme option, clearer VPN state, safer Android defaults, and enough real utility to test on Samsung and OnePlus devices.

## Product Direction

KernelVPN should feel quiet, native, fast, and trustworthy. The default UI is light: white background, soft gray surfaces, thin separators, black text, restrained blue accents, green success states, and no emoji UI. Dark mode uses the same layout with graphite surfaces and high contrast text.

The first screen is the actual VPN control surface, not a landing page. It shows the service name, current connection state, active profile, a large connect control, a clear skeleton-mode warning while the proxy core is not integrated, quick actions, and a theme toggle.

## Screens

- Home: connection state, connect/disconnect, active profile summary, useful metadata, settings/action rows, theme toggle.
- Import Profile: paste link, parse, preview, save as active. VLESS remains primary; Trojan, Shadowsocks, and VMess get practical parser support where safe.
- Split Tunneling: segmented mode selector, search, app list, selected count, Samsung/OnePlus-friendly density, memoized rows.
- Diagnostics: auto-refreshable health checklist with VPN permission, service state, core integration, battery optimization warning, and timestamp.

## Native Android

- Rename visible app/service strings to KernelVPN.
- Keep package source paths stable unless a deeper package migration is required.
- Disable React Native new architecture for this project until native library packaging is fixed, because the current crash log shows `libreact_featureflagsjni.so` missing with `newArchEnabled=true`.
- Keep VPN service non-exported.
- Avoid full-tunnel routing in skeleton mode to prevent blackholing device traffic.
- Harden cleartext defaults while keeping local development hosts available through network security config.

## Testing And Verification

- Add Jest tests for protocol parsing and theme token behavior.
- Add a minimal ESLint config so `npm run lint` is meaningful.
- Verify with `npm test`, `npm run lint`, `npx tsc --noEmit`, and Android Gradle assemble.
- Run dependency/security checks using npm audit and targeted manifest/native-code review.

## Concept

Primary design concept image:
`/Users/kalinicenkovitalijmikolajovic/.codex/generated_images/019e3cab-851d-7ea3-8fc0-53852fe28e6f/ig_0b930293a83273ba016a0b78d3f4308191bce8ee834d414660.png`
