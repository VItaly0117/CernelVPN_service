import {sanitize, sanitizeObject} from './logSanitizer';

describe('logSanitizer', () => {
  describe('sanitize string', () => {
    it('returns empty string for empty inputs', () => {
      expect(sanitize(null)).toBe('');
      expect(sanitize(undefined)).toBe('');
      expect(sanitize('')).toBe('');
    });

    it('masks VMess links fully', () => {
      const link = 'vmess://ew0KICAidiI6ICIyIiwNCiAgInBzIjogIk5vZGUiLA0KICAiYWRkIjogIjEuMS4xLjEiLA0KICAicG9ydCI6IDQ0MywNCiAgImlkIjogImJiYiINCn0=';
      expect(sanitize(link)).toBe('vmess://[MASKED_VMESS_LINK]');
    });

    it('masks VLESS, Trojan, and Shadowsocks links partially preserving safe details', () => {
      const vlessLink = 'vless://user-uuid-123@my-server-domain.com:443?pbk=publickey123&sid=sessionid123&flow=xtls-rprx-vision#MyVlessNode';
      // Expected host my-server-domain.com masked as my***.com
      const sanitized = sanitize(vlessLink);
      expect(sanitized).toContain('vless://[MASKED]@my***om:443');
      expect(sanitized).toContain('pbk=[MASKED]');
      expect(sanitized).toContain('sid=[MASKED]');
      expect(sanitized).toContain('flow=xtls-rprx-vision'); // Harmless param preserved
      expect(sanitized).toContain('#MyVlessNode'); // Name preserved
    });

    it('masks standard UUIDs completely', () => {
      const text = 'Connected user with UUID 12345678-abcd-1234-abcd-1234567890ab successfully';
      expect(sanitize(text)).toBe('Connected user with UUID [MASKED_UUID] successfully');
    });

    it('masks key-value credential patterns', () => {
      expect(sanitize('password: mySecretPassword')).toBe('password: [MASKED]');
      expect(sanitize('cookie = "session_token_123"')).toBe('cookie = "[MASKED]"');
      expect(sanitize('my token: token_val')).toBe('my token: [MASKED]');
      expect(sanitize('Reality public key: public_reality_key')).toBe('Reality public key: [MASKED]');
    });

    it('does not mask harmless boolean or null configurations', () => {
      expect(sanitize('password: true')).toBe('password: true');
      expect(sanitize('token: null')).toBe('token: null');
    });
  });

  describe('sanitizeObject recursively', () => {
    it('returns primitive values directly except strings', () => {
      expect(sanitizeObject(123)).toBe(123);
      expect(sanitizeObject(true)).toBe(true);
      expect(sanitizeObject(null)).toBeNull();
    });

    it('masks sensitive object keys at any nesting level', () => {
      const dirtyObj = {
        name: 'John Doe',
        password: 'johns_password',
        session: 'cookie_value',
        nested: {
          token: 'sensitive_jwt_token',
          safeParam: 'safe_value',
        },
        arrayData: [
          'vless://user@host.com:443',
          {uuid: '12345678-abcd-1234-abcd-1234567890ab'},
        ],
      };

      const sanitized = sanitizeObject(dirtyObj) as any;

      expect(sanitized.name).toBe('John Doe');
      expect(sanitized.password).toBe('[MASKED]');
      expect(sanitized.session).toBe('[MASKED]');
      expect(sanitized.nested.token).toBe('[MASKED]');
      expect(sanitized.nested.safeParam).toBe('safe_value');
      expect(sanitized.arrayData[0]).toContain('[MASKED]');
      expect(sanitized.arrayData[1].uuid).toBe('[MASKED]');
    });
  });
});
