import {Buffer} from 'buffer';
import {parseProfileLink} from './profileParser';
import type {VpnProfile, VpnSubscription} from '../types/vpn';
import {vpnStore} from '../store/vpnStore';
import {appLogger} from './appLogger';

/**
 * Fetches a subscription URL, decodes the Base64 content, and parses the profiles.
 */
export async function fetchSubscription(sub: VpnSubscription): Promise<void> {
  appLogger.info('subscription', `Fetching subscription: ${sub.url}`);
  try {
    const response = await fetch(sub.url, {
      headers: {
        'User-Agent': 'KernelVPN/1.0',
        'Cache-Control': 'no-cache',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const text = await response.text();
    let decodedText = text.trim();

    // Try decoding as Base64. Subscriptions are usually Base64 encoded.
    if (!decodedText.includes('://')) {
      try {
        decodedText = Buffer.from(decodedText, 'base64').toString('utf8');
      } catch (e) {
        appLogger.warn('subscription', 'Failed to decode Base64, parsing as plain text');
      }
    }

    const lines = decodedText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    const profiles: VpnProfile[] = [];

    for (const line of lines) {
      if (line.includes('://')) {
        const result = parseProfileLink(line);
        if (result.success && result.profile) {
          result.profile.subscriptionId = sub.id;
          profiles.push(result.profile);
        }
      }
    }

    if (profiles.length > 0) {
      sub.updatedAt = Date.now();
      vpnStore.updateSubscription(sub, profiles);
      appLogger.info('subscription', `Successfully updated subscription ${sub.name}: added ${profiles.length} profiles.`);
    } else {
      throw new Error('No valid profiles found in subscription data.');
    }
  } catch (error: any) {
    appLogger.error('subscription', `Failed to fetch subscription ${sub.name}: ${error.message}`);
    throw error;
  }
}
