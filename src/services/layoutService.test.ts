import {androidHeaderTopPadding} from './layoutService';

describe('layoutService', () => {
  it('adds Android status bar height above header controls', () => {
    expect(androidHeaderTopPadding('android', 32, 12)).toBe(44);
  });

  it('keeps the base header padding on non-Android platforms', () => {
    expect(androidHeaderTopPadding('ios', 32, 12)).toBe(12);
  });
});
