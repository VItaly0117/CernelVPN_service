# KernelVPN — Premium System Architecture & Feature Documentation

Welcome to the official developer documentation for **KernelVPN**, a premium high-performance Android VPN client built with **React Native** and powered by a native **Kotlin Service** wrapping the cutting-edge **Sing-box** kernel. 

This client combines a fluid, glassmorphic UI with advanced features: native Android Quick Settings integration, real-time connectivity handovers, DNS ad blocking, and application-level firewalls.

---

## 🏗️ 1. High-Level Technical Architecture

KernelVPN utilizes a split-layer hybrid architecture where the lightweight React Native interface acts as a presentation and state management layer, communicating with a low-level Kotlin VPN Service through a custom React Native Native Module Bridge.

```mermaid
graph TD
    subgraph React Native Layer (TS)
        Store[vpnStore.ts] -->|State Persistence| Persist[statePersistence.ts]
        UI[HomeScreen / SplitTunnelingScreen] -->|Select Profile / Rules| Store
        Store -->|Start/Stop Command| Bridge[VpnBridgeModule.ts]
    end

    subgraph Native Android Layer (Kotlin)
        Bridge -->|JSON payload| VpnBridge[VpnBridgeModule.kt]
        VpnBridge -->|Start Service| Service[PersonalVpnService.kt]
        Service -->|Boot Core| Singbox[Sing-box TUN Core]
        
        Tile[VpnTileService.kt] -->|Toggle status bar| Service
        Service -->|RequestListeningState| Tile
        
        ConnCallback[NetworkCallback] -->|Detect Wi-Fi / Cell switch| VpnBridge
        VpnBridge -->|Trigger restart with matching rules| Service
    end
    
    subgraph System Network Layer
        Singbox -->|Intercepts Traffic| TUN[TUN Interface]
        TUN -->|App Blocks| Block[Outbound: Block]
        TUN -->|DNS requests| AdGuard[AdGuard DoH: https://dns.adguard-dns.com]
        TUN -->|Regular Traffic| Proxy[VLESS / Trojan Proxy Outbound]
    end
```

### 🛰️ The Native Bridge Protocol
All controls and metrics flow asynchronously across the Bridge:
1. **Configuration payload**: When the user presses *Connect*, `vpnStore` compiles a detailed execution payload (`VpnStartPayload`) containing the full connection profile, split-tunneling preferences, AdBlock status, and custom domain rules.
2. **JSON Serialization**: The configuration is serialized to a JSON string and sent to `VpnBridgeModule.kt`.
3. **Android Service Lifecycle**: The bridge initiates a foreground `PersonalVpnService` with a persistent notification, starting the native Sing-box TUN engine.
4. **Event Emitting**: Network speeds, connection statuses (`connecting`, `connected`, `disconnected`, `error`), and system notifications are emitted back to React Native via Device Event Emitters.

---

## 🛡️ 2. Core Features Deep Dive

### 📶 A. Android Quick Settings Tile (`VpnTileService`)
To provide extreme accessibility, KernelVPN includes a native Android status drawer tile:
* **Registration**: The tile is registered in the system manifest under the `BIND_QUICK_SETTINGS_TILE` permission.
* **Dynamic Connection Binding**: Clicking the tile invokes the standard start/stop service sequence.
* **Zero-App-State Booting**: If the main app is closed, `VpnTileService` reads the last successful connection payload from Android's private `SharedPreferences` (`last_start_payload`), allowing instant one-click activation directly from the status panel.
* **System Callback Listener**: When `PersonalVpnService` changes its state (connected, disconnected), it broadcasts a callback trigger calling `TileService.requestListeningState` to instantly repaint the tile's active highlight state inside the drawer.

---

### 🚫 B. One-Click App Firewall (App Block)
KernelVPN provides a robust, per-app network firewall allowing users to blacklist specific applications and deny them internet access completely when the VPN is active:
* **The `block` Outbound**: Inside `singBoxConfig.ts`, a custom outbound labeled `"block"` of type `"dns"` or `"direct"` is defined, routing matching packages to a discard loopback.
* **Routing Rules Injection**: Applications selected for blocking have their Android package IDs (`com.company.app`) added to a dedicated Sing-box routing rule:
  ```json
  {
    "type": "field",
    "package_name": ["com.target.app", "com.malicious.app"],
    "outbound": "block"
  }
  ```
* **UI Interface**: The **App Block** sub-tab inside the *Routing & Filters* panel gives the user an alphabetical, searchable list of installed apps with instant toggles to blacklist them.

---

### 📶 C. Network-Aware Split Tunneling & Instant Handover
Most mobile users face issues when moving between cellular connections and home Wi-Fi. KernelVPN implements a sophisticated dual-network profile structure:
* **Independent Profiles**: Users configure different app routing rules for **Wi-Fi** (`splitTunnelRulesWifi`) and **Cellular** (`splitTunnelRulesCellular`).
* **Active Connectivity Listener**: A native `ConnectivityManager.NetworkCallback` runs continuously in `VpnBridgeModule.kt`.
* **Zero-Delay Handover**: As soon as the active network interface changes (e.g., leaving a Wi-Fi zone), the native bridge senses the handover and immediately re-evaluates the rules, triggering a seamless, sub-second tunnel reload using the appropriate app routing profile for the new connection type.

---

### 🛡️ D. DNS-Level AdBlocker
* **Configuration Detouring**: When AdBlock is toggled on, the JSON configuration generator replaces default upstream DNS resolvers with secure **AdGuard DNS-over-HTTPS (DoH)**:
  `https://dns.adguard-dns.com/dns-query`
* **Local Caching**: Intercepted DNS queries are cached inside Sing-box to ensure optimal resolution speeds, while blacklisted domain patterns are rejected locally before leaving the device.

---

## 🎨 3. Premium UI/UX & Aesthetics

The application layout has been upgraded from generic native widgets to a custom **Midnight Carbon & Electric Violet** premium theme.

### 💎 The Color Palette (HSL System)
* **Background**: Ultimate Carbon (`#0D0E12`) for an elegant, low-glare dark mode.
* **Card Backings**: Smooth, glassmorphic overlays (`hsla(223, 20%, 14%, 0.6)`) with subtle grey borders.
* **Secure Highlight**: Royal Indigo (`#8B5CF6`) and Electric Violet (`#D946EF`) represent encrypted, high-performance tunnels, while green is reserved for confirmed protected state.
* **Blocked/Warning Accent**: Crimson Red (`#FF4D4D` / `hsl(0, 100%, 65%)`) for firewall rules and errors.

### 🛡️ Animated Shield & Traffic Flows (`AnimatedShield.tsx`)
A custom vector-based canvas component replaces flat connection icons.
* **Double Rotating Rings**: Two concentric dotted rings spin in opposite directions to represent active encryption cycles.
* **Secured Particle Flow**: An array of floating particle coordinates are animated at 60fps using native-driven React Native `Animated` drivers.
  * **Disconnected State**: Small red particles float slowly, fading and drifting in chaotic trajectories.
  * **Connecting State**: Particles speed up, align, and begin flowing directly toward the center.
  * **Connected State**: Particles transform into violet traffic streams that pass through the shield and exit as protected green flow.

### 🔔 Custom Top Notification Toast (`CustomNotification.tsx`)
Rather than utilizing basic Android alert dialogs, KernelVPN features a custom glassmorphic top-floating notification system:
* **Physics-Based Entrance**: Driven by a spring configuration (`friction: 8`, `tension: 40`), sliding down smoothly from the top notch.
* **Status Theming**: Dynamically adjusts icons and glow boundaries depending on the connection event (e.g., secure VLESS connection, cellular network reload, profile validation warning).

---

## 📂 4. Project Directory Structure

```text
/React_Project_VPN
├── android/                             # Android Native Kotlin & Java Projects
│   └── app/src/main/
│       ├── AndroidManifest.xml          # Declares VpnService and VpnTileService
│       └── java/com/personalvpn/vpn/
│           ├── VpnBridgeModule.kt       # Native module exposing controls to React Native
│           ├── PersonalVpnService.kt    # Foreground service hosting Sing-box core
│           └── VpnTileService.kt        # Android Quick Settings panel service
│
├── src/                                 # React Native Application Layer
│   ├── types/
│   │   └── vpn.ts                       # Strong TypeScript models (Profiles, Rules, States)
│   ├── store/
│   │   └── vpnStore.ts                  # Lightweight reactive state store managing state and UI actions
│   ├── services/
│   │   ├── statePersistence.ts          # Serialization/Sanitization wrapper for MMKV/Storage
│   │   ├── singBoxConfig.ts             # Compiles JSON configurations for the Sing-box core
│   │   └── vpnStartPayload.ts           # Compiles parameters sent to the Kotlin bridge
│   ├── components/
│   │   ├── AnimatedShield.tsx           # Premium core-animation component
│   │   ├── CustomNotification.tsx       # Float-in glassmorphic notification banner
│   │   ├── ServerCard.tsx               # Renders selected remote server connection nodes
│   │   └── StatusCard.tsx               # Renders real-time telemetry and network badges
│   ├── screens/
│   │   ├── HomeScreen.tsx               # Main visual dashboard and quick toggle
│   │   ├── SplitTunnelingScreen.tsx     # Tabbed router (Apps, Domains, AppBlock, Settings)
│   │   └── ImportProfileScreen.tsx      # Config link parser and QR importer
│   └── theme/
│       └── theme.ts                     # Central design tokens and HSL values
```

---

## 🛠️ 5. Development & Compilation Workflow

### 🧪 Running Verification Tests
Ensure all units are validated before compilation:
```bash
# Execute Jest unit tests (includes persistence sanitization verification)
npm test

# Run the TypeScript compiler checker
npx tsc --noEmit

# Run ESLint validation
npm run lint
```

### 📦 Compiling the Debug APK
To bundle all React Native assets and produce the verified, installable Android Package (`.apk`):
1. **Ensure the Android SDK is configured** and path tools are loaded (`ANDROID_HOME`).
2. **Execute the clean build routine** inside the native Android folder:
   ```bash
   cd android
   ./gradlew clean assembleDebug
   ```
3. **Output Artifact**: The compiled package will be generated at:
   `android/app/build/outputs/apk/debug/app-debug.apk`

*Tip: For convenience, copy and rename the compiled package to the workspace root directory as `KernelVPN-NewFilters-Debug.apk` for easy distribution to test devices.*
