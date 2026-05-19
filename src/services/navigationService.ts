export type AppScreenName =
  | 'Home'
  | 'ImportProfile'
  | 'SplitTunneling'
  | 'Diagnostics'
  | 'Panel';

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
