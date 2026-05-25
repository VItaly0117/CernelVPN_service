export type AppScreenName =
  | 'Home'
  | 'ImportProfile'
  | 'SplitTunneling'
  | 'Diagnostics'
  | 'Servers'
  | 'Panel'
  | 'Settings'
  | 'EventLog'
  | 'QRScanner';

export interface BackNavigationResult {
  handled: boolean;
  nextScreen: AppScreenName;
}

export function resolveBackNavigation(
  _currentScreen: AppScreenName,
): BackNavigationResult {
  return {
    handled: true,
    nextScreen: 'Home',
  };
}
