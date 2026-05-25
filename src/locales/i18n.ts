import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { NativeModules, Platform } from 'react-native';

import en from './en.json';
import ru from './ru.json';
import uk from './uk.json';

const resources = {
  en: { translation: en },
  ru: { translation: ru },
  uk: { translation: uk },
};

export const LANG_OPTIONS = [
  { code: 'en', label: 'English' },
  { code: 'ru', label: 'Русский' },
  { code: 'uk', label: 'Українська' },
];

// Attempt to detect device language
let deviceLanguage = 'en';
try {
  if (Platform.OS === 'ios') {
    deviceLanguage =
      NativeModules.SettingsManager?.settings?.AppleLocale ||
      NativeModules.SettingsManager?.settings?.AppleLanguages[0]; // iOS 13
  } else {
    deviceLanguage = NativeModules.I18nManager?.localeIdentifier;
  }
} catch (e) {
  console.warn('Failed to detect device language', e);
}

if (deviceLanguage) {
  deviceLanguage = deviceLanguage.split('_')[0]; // e.g. "en_US" -> "en"
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: deviceLanguage || 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

export default i18n;
