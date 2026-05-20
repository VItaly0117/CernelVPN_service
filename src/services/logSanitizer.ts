/**
 * logSanitizer.ts — Mask credentials, cookies, tokens, and server details.
 */

/**
 * Sanitize a string by masking sensitive keywords, links, and patterns.
 */
export function sanitize(text: string | null | undefined): string {
  if (!text) {
    return '';
  }

  let sanitized = text;

  // 1. Mask VLESS / VMess / Trojan / SS links (e.g. vless://uuid@host:port?query#name)
  sanitized = sanitized.replace(
    /(vless|trojan|ss|vmess):\/\/([^\s"'`]+)/gi,
    (match, protocol, body) => {
      const proto = protocol.toLowerCase();
      if (proto === 'vmess') {
        return 'vmess://[MASKED_VMESS_LINK]';
      }

      // VLESS, Trojan, SS links format: userinfo@host:port?query#name or base64
      const hashIndex = body.indexOf('#');
      const mainPart = hashIndex >= 0 ? body.substring(0, hashIndex) : body;
      const namePart = hashIndex >= 0 ? body.substring(hashIndex) : '';

      const atIndex = mainPart.indexOf('@');
      if (atIndex >= 0) {
        const remainder = mainPart.substring(atIndex + 1);

        // Mask server host partially (e.g. keep first 2 and last 2 characters)
        const qIndex = remainder.indexOf('?');
        const hostPort = qIndex >= 0 ? remainder.substring(0, qIndex) : remainder;
        const query = qIndex >= 0 ? remainder.substring(qIndex) : '';

        const colonIndex = hostPort.lastIndexOf(':');
        let host = colonIndex >= 0 ? hostPort.substring(0, colonIndex) : hostPort;
        const port = colonIndex >= 0 ? hostPort.substring(colonIndex) : '';

        if (host.length > 4) {
          host = host.substring(0, 2) + '***' + host.substring(host.length - 2);
        } else {
          host = '***';
        }

        // Mask query params (pbk, sid, password)
        let maskedQuery = query;
        if (query) {
          maskedQuery = query.replace(
            /(pbk|sid|password|secret|key|id)=([^&]+)/gi,
            '$1=[MASKED]',
          );
        }

        return `${protocol}://[MASKED]@${host}${port}${maskedQuery}${namePart}`;
      }

      // Base64 SS links or unrecognized formats
      return `${protocol}://[MASKED_LINK]`;
    },
  );

  // 2. Mask UUIDs (standard 8-4-4-4-12 hex string)
  sanitized = sanitized.replace(
    /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g,
    '[MASKED_UUID]',
  );

  // 3. Mask passwords, session tokens, keys, cookies, credentials in key-value format (JSON or URL parameters)
  sanitized = sanitized.replace(
    /(session|cookie|password|pass|token|secret|pbk|sid|key|publicKey|privateKey)(["']?\s*[:=]\s*["']?)([^\s"'`,;&]+)/gi,
    (m, key, sep, val) => {
      // Don't mask key names themselves or harmless booleans
      const lowerVal = val.toLowerCase();
      if (lowerVal === 'true' || lowerVal === 'false' || lowerVal === 'null') {
        return m;
      }
      return `${key}${sep}[MASKED]`;
    },
  );

  // 4. Clean Reality keys explicitly in sentences
  sanitized = sanitized.replace(
    /(Reality public key|Reality private key|public key|private key)(["']?\s*[:=]\s*["']?)([^\s"'`,;&]+)/gi,
    '$1$2[MASKED]',
  );

  return sanitized;
}

/**
 * Recursively sanitize an object or value.
 */
export function sanitizeObject(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitize(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  if (typeof obj === 'object') {
    const res: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
      const isSensitiveKey = /(session|cookie|password|pass|token|secret|pbk|sid|key|uuid)/i.test(key);
      if (isSensitiveKey && typeof val === 'string') {
        res[key] = '[MASKED]';
      } else {
        res[key] = sanitizeObject(val);
      }
    }
    return res;
  }

  return obj;
}
