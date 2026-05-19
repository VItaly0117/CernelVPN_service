import {resolveBackNavigation} from './navigationService';

describe('navigationService', () => {
  it('returns home when Android back is pressed from a nested screen', () => {
    expect(resolveBackNavigation('Panel')).toEqual({
      handled: true,
      nextScreen: 'Home',
    });
  });

  it('keeps the app open when Android back is pressed on home', () => {
    expect(resolveBackNavigation('Home')).toEqual({
      handled: true,
      nextScreen: 'Home',
    });
  });
});
