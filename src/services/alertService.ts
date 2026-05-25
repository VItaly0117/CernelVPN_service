/**
 * alertService.ts
 * Tiny event emitter so any module can trigger a custom alert
 * without importing React components directly.
 */

type AlertAction = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

type AlertPayload = {
  title: string;
  message?: string;
  actions?: AlertAction[];
};

type Listener = (payload: AlertPayload) => void;

let _listener: Listener | null = null;

export const alertService = {
  /** Called by CustomAlertModal to register itself */
  setListener(listener: Listener) {
    _listener = listener;
  },

  /** Called from anywhere (e.g. overriding Alert.alert) */
  show(title: string, message?: string, actions?: AlertAction[]) {
    if (_listener) {
      _listener({title, message, actions});
    } else {
      // Fallback to native alert if listener not yet registered
      console.warn('[alertService] No listener registered, falling back to console.');
    }
  },
};

export type {AlertPayload, AlertAction};
