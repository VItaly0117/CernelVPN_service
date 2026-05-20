/**
 * appLogger.ts — Ring-buffered central logger for KernelVPN.
 */
import {sanitize, sanitizeObject} from './logSanitizer';

export interface LogEvent {
  id: string;
  timestamp: string; // ISO String
  level: 'verbose' | 'debug' | 'info' | 'warn' | 'error';
  source:
    | 'frontend'
    | 'native-vpn'
    | 'core'
    | 'xui-panel'
    | 'profile-import'
    | 'split-tunnel'
    | 'persistence';
  code?: string;
  message: string;
  details?: object;
  raw?: string;
}

const BUFFER_MAX_SIZE = 500;
let ringBuffer: LogEvent[] = [];

type LogListener = (logs: LogEvent[]) => void;
const listeners = new Set<LogListener>();

// Deferred store reference to avoid potential circular dependency issues
let storeRef: { addPersistedError(err: LogEvent): void } | null = null;

export function setStoreRef(store: { addPersistedError(err: LogEvent): void } | null): void {
  storeRef = store;
}

export function subscribeToLogs(listener: LogListener): () => void {
  listeners.add(listener);
  listener([...ringBuffer]);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners(): void {
  const currentLogs = [...ringBuffer];
  listeners.forEach(fn => fn(currentLogs));
}

export function getLogs(): LogEvent[] {
  return [...ringBuffer];
}

export function clearLogs(): void {
  ringBuffer = [];
  notifyListeners();
}

/**
 * Load persisted errors back into the ring buffer (e.g. on application startup).
 */
export function loadPersistedErrors(errors: LogEvent[]): void {
  if (!errors || !Array.isArray(errors)) {
    return;
  }

  // Prepend them to the ring buffer, keeping unique IDs
  const existingIds = new Set(ringBuffer.map(e => e.id));
  const toAdd = errors.filter(e => !existingIds.has(e.id));

  ringBuffer = [...toAdd, ...ringBuffer].slice(0, BUFFER_MAX_SIZE);
  notifyListeners();
}

export function log(
  level: LogEvent['level'],
  source: LogEvent['source'],
  message: string,
  options?: {code?: string; details?: object; raw?: string},
): LogEvent {
  const sanitizedMessage = sanitize(message);
  const sanitizedDetails = options?.details
    ? (sanitizeObject(options.details) as object)
    : undefined;
  const sanitizedRaw = options?.raw ? sanitize(options.raw) : undefined;

  const event: LogEvent = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    timestamp: new Date().toISOString(),
    level,
    source,
    code: options?.code,
    message: sanitizedMessage,
    details: sanitizedDetails,
    raw: sanitizedRaw,
  };

  // Add to ring buffer (newest first)
  ringBuffer.unshift(event);
  if (ringBuffer.length > BUFFER_MAX_SIZE) {
    ringBuffer.pop();
  }

  // Save critical errors to persisted state
  if (level === 'error' && storeRef) {
    try {
      storeRef.addPersistedError(event);
    } catch (err) {
      console.warn('[Logger] Failed to persist critical error', err);
    }
  }

  notifyListeners();
  return event;
}

export const appLogger = {
  verbose(
    source: LogEvent['source'],
    message: string,
    options?: {code?: string; details?: object; raw?: string},
  ): LogEvent {
    return log('verbose', source, message, options);
  },
  debug(
    source: LogEvent['source'],
    message: string,
    options?: {code?: string; details?: object; raw?: string},
  ): LogEvent {
    return log('debug', source, message, options);
  },
  info(
    source: LogEvent['source'],
    message: string,
    options?: {code?: string; details?: object; raw?: string},
  ): LogEvent {
    return log('info', source, message, options);
  },
  warn(
    source: LogEvent['source'],
    message: string,
    options?: {code?: string; details?: object; raw?: string},
  ): LogEvent {
    return log('warn', source, message, options);
  },
  error(
    source: LogEvent['source'],
    message: string,
    options?: {code?: string; details?: object; raw?: string},
  ): LogEvent {
    return log('error', source, message, options);
  },

  /**
   * Export all log events as a JSON string with metadata.
   */
  exportAsJson(): string {
    return JSON.stringify({
      appVersion: '0.4.0',
      exportedAt: new Date().toISOString(),
      totalEvents: ringBuffer.length,
      events: [...ringBuffer],
    });
  },
};
