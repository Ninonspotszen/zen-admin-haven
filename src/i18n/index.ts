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

// Côté serveur, il n'y a ni navigateur ni stockage local : sans précision, la page était rendue en anglais
// (langue de secours), puis réécrite en français dans le navigateur. Résultat : erreur d'hydratation React,
// page re-dessinée et Google qui voyait le site en anglais. Le serveur rend donc en français, langue principale du site ;
// le navigateur détecte ensuite la langue du visiteur comme avant.
const COTE_SERVEUR = typeof window === 'undefined';
if (!COTE_SERVEUR) i18n.use(LanguageDetector);

i18n
  .use(initReactI18next)
  .init({
    ...(COTE_SERVEUR ? { lng: 'fr' } : {}),
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
