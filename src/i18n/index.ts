import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import fr from './locales/fr.json';
import en from './locales/en.json';
import de from './locales/de.json';
import nl from './locales/nl.json';
import es from './locales/es.json';

const SUPPORTED_LANGS = ['fr', 'en', 'de', 'nl', 'es'] as const;
const STORAGE_KEY = 'sz-lang';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
      de: { translation: de },
      nl: { translation: nl },
      es: { translation: es },
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: STORAGE_KEY,
      caches: ['localStorage'],
    },
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGS,
    load: 'languageOnly',
    interpolation: { escapeValue: false, prefix: '{', suffix: '}' },
    ns: ['translation'],
    defaultNS: 'translation',
  });

export default i18n;
export { SUPPORTED_LANGS, STORAGE_KEY };
