import {
  appLogger,
  clearLogs,
  getLogs,
  subscribeToLogs,
  setStoreRef,
  loadPersistedErrors,
  type LogEvent,
} from './appLogger';

describe('appLogger', () => {
  beforeEach(() => {
    clearLogs();
    setStoreRef(null);
  });

  it('stores and maintains up to 500 events in a ring buffer', () => {
    // Log 550 items
    for (let i = 1; i <= 550; i++) {
      appLogger.info('frontend', `Log entry number ${i}`);
    }

    const currentLogs = getLogs();
    expect(currentLogs.length).toBe(500);
    // Newest is first, so the first element should be log entry 550
    expect(currentLogs[0].message).toBe('Log entry number 550');
    // Oldest preserved is 51 (since 550 - 500 = 50 dropped)
    expect(currentLogs[499].message).toBe('Log entry number 51');
  });

  it('tags logs with correct levels and sources', () => {
    const event = appLogger.error('core', 'Critical connection failure', {
      code: 'ERR_TIMEOUT',
      details: {retries: 3},
    });

    expect(event.level).toBe('error');
    expect(event.source).toBe('core');
    expect(event.message).toBe('Critical connection failure');
    expect(event.code).toBe('ERR_TIMEOUT');
    expect(event.details).toEqual({retries: 3});
    expect(event.timestamp).toBeDefined();
    expect(event.id).toBeDefined();
  });

  it('sanitizes logged messages and details automatically', () => {
    const event = appLogger.warn(
      'xui-panel',
      'User logged in with password: unsafe_pass',
      {details: {token: 'session_uuid_12345678-abcd-1234-abcd-1234567890ab'}},
    );

    expect(event.message).toBe('User logged in with password: [MASKED]');
    expect((event.details as any).token).toBe('[MASKED]');
  });

  it('notifies subscribers reactively on new log events', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeToLogs(listener);

    // Initial load notifies subscriber with empty array
    expect(listener).toHaveBeenCalledWith([]);

    appLogger.info('frontend', 'React component mounted');
    expect(listener).toHaveBeenLastCalledWith([
      expect.objectContaining({
        message: 'React component mounted',
        level: 'info',
        source: 'frontend',
      }),
    ]);

    unsubscribe();
    listener.mockClear();

    appLogger.info('frontend', 'React component unmounted');
    expect(listener).not.toHaveBeenCalled();
  });

  it('forwards critical errors to storeRef if registered', () => {
    const mockStore = {
      addPersistedError: jest.fn(),
    };

    setStoreRef(mockStore);

    // Log warning -> should NOT persist
    appLogger.warn('split-tunnel', 'Harmless split rule warning');
    expect(mockStore.addPersistedError).not.toHaveBeenCalled();

    // Log error -> should persist
    const errEvent = appLogger.error('native-vpn', 'Failed to start tunnel');
    expect(mockStore.addPersistedError).toHaveBeenCalledWith(errEvent);
  });

  it('loads persisted errors back into buffer avoiding duplicates', () => {
    const initialEvent = appLogger.info('frontend', 'Running');

    const errorEvent1: LogEvent = {
      id: 'err-1',
      timestamp: new Date().toISOString(),
      level: 'error',
      source: 'persistence',
      message: 'Critical Hydration Failure',
    };

    // Load error list
    loadPersistedErrors([errorEvent1]);

    let logs = getLogs();
    expect(logs.length).toBe(2);
    expect(logs[0].id).toBe('err-1'); // Loaded prepended or merged
    expect(logs[1].id).toBe(initialEvent.id);

    // Load again with duplicate - should not duplicate
    loadPersistedErrors([errorEvent1]);
    expect(getLogs().length).toBe(2);
  });

  it('logs verbose level events correctly', () => {
    const event = appLogger.verbose('frontend', 'Detailed trace info', {
      code: 'TRACE_001',
      details: {step: 'init'},
    });

    expect(event.level).toBe('verbose');
    expect(event.source).toBe('frontend');
    expect(event.message).toBe('Detailed trace info');
    expect(event.code).toBe('TRACE_001');
    expect(event.details).toEqual({step: 'init'});

    const logs = getLogs();
    expect(logs[0].level).toBe('verbose');
  });

  it('exportAsJson returns valid JSON with expected structure', () => {
    appLogger.info('frontend', 'First event');
    appLogger.error('core', 'Second event');

    const jsonStr = appLogger.exportAsJson();
    const parsed = JSON.parse(jsonStr);

    expect(parsed.appVersion).toBe('0.4.0');
    expect(typeof parsed.exportedAt).toBe('string');
    expect(parsed.totalEvents).toBe(2);
    expect(Array.isArray(parsed.events)).toBe(true);
    expect(parsed.events.length).toBe(2);
    // Newest first
    expect(parsed.events[0].message).toBe('Second event');
    expect(parsed.events[1].message).toBe('First event');
  });
});
