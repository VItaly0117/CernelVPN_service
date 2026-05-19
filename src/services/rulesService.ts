/**
 * rulesService.ts — Remote rules manifest fetching and application.
 *
 * Provides methods to fetch, validate, and apply remote JSON rule manifests.
 * These rules control split tunneling and routing decisions.
 *
 * Security notes:
 *   - Only JSON config/rules are fetched — no executable code.
 *   - TODO: Add Ed25519 signature verification for manifest integrity.
 *   - TODO: Pin the manifest URL and add certificate pinning.
 */
import type {RulesManifest} from '../types/vpn';
import {vpnStore} from '../store/vpnStore';

// ---------------------------------------------------------------------------
// Demo / Mock data
// ---------------------------------------------------------------------------

const DEMO_MANIFEST: RulesManifest = {
  version: 1,
  updatedAt: '2026-01-01T00:00:00Z',
  minAppVersion: '0.1.0',
  rules: {
    directApps: [
      'com.android.vending',      // Play Store
      'com.google.android.gms',   // Google Play Services
    ],
    directDomains: [
      'play.googleapis.com',
      'connectivitycheck.gstatic.com',
    ],
    proxyDomains: [
      // Domains that should always go through VPN
    ],
  },
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch a rules manifest from a remote URL.
 * Currently returns demo data. In production, this should make an HTTP request.
 *
 * @param url - The URL to fetch the manifest from.
 */
export async function fetchRulesManifest(
  _url: string,
): Promise<RulesManifest> {
  // TODO: Replace with actual HTTP fetch
  // const response = await fetch(url);
  // if (!response.ok) throw new Error(`HTTP ${response.status}`);
  // const manifest = await response.json();
  // return manifest as RulesManifest;

  // For now, simulate network delay and return demo data
  await new Promise(resolve => setTimeout(resolve, 500));
  return {...DEMO_MANIFEST};
}

/**
 * Validate a rules manifest for required fields and version compatibility.
 */
export function validateRulesManifest(manifest: RulesManifest): boolean {
  if (!manifest) {return false;}
  if (typeof manifest.version !== 'number' || manifest.version < 1) {return false;}
  if (!manifest.updatedAt) {return false;}
  if (!manifest.rules) {return false;}
  if (!Array.isArray(manifest.rules.directApps)) {return false;}
  if (!Array.isArray(manifest.rules.directDomains)) {return false;}
  if (!Array.isArray(manifest.rules.proxyDomains)) {return false;}

  // TODO: Verify Ed25519 signature
  // if (manifest.signature) {
  //   const isValid = verifyEd25519(manifest, manifest.signature);
  //   if (!isValid) return false;
  // }

  return true;
}

/**
 * Apply a validated rules manifest.
 * Currently stores rules in memory. Future: persist and propagate to native layer.
 */
export async function applyRulesManifest(
  manifest: RulesManifest,
): Promise<void> {
  if (!validateRulesManifest(manifest)) {
    throw new Error('Invalid rules manifest');
  }

  const directApps = new Set(manifest.rules.directApps);
  const current = vpnStore.getState().splitTunnelRules;
  if (current.length > 0) {
    vpnStore.setSplitTunnelRules(
      current.map(rule =>
        directApps.has(rule.packageName) ? {...rule, enabled: true} : rule,
      ),
    );
  }
  vpnStore.setLastRulesUpdate(Date.now());

  // TODO: Persist to storage
  // TODO: Propagate domain rules to core config

  console.log(
    `[RulesService] Applied manifest v${manifest.version} ` +
      `(${manifest.rules.directApps.length} direct apps, ` +
      `${manifest.rules.directDomains.length} direct domains, ` +
      `${manifest.rules.proxyDomains.length} proxy domains)`,
  );
}
