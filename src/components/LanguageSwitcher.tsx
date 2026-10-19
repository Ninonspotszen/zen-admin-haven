import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGS } from '@/i18n/index';

const LANG_LABELS: Record<string, string> = { fr: 'FR', en: 'EN', de: 'DE', nl: 'NL', es: 'ES' };

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const currentLang = i18n.language;
  const handleChange = (lang: string) => { i18n.changeLanguage(lang); };
  return (
    <nav aria-label={t('nav.lang.ariaLabel')} className="flex items-center gap-1">
      {SUPPORTED_LANGS.map((lang, idx) => (
        <span key={lang} className="flex items-center">
          <button
            onClick={() => handleChange(lang)}
            aria-current={currentLang === lang ? 'true' : undefined}
            className={`text-xs font-medium tracking-wide transition-opacity ${
              currentLang === lang ? 'opacity-100 underline underline-offset-2' : 'opacity-90 hover:opacity-100'
            }`}
          >
            {LANG_LABELS[lang]}
          </button>
          {idx < SUPPORTED_LANGS.length - 1 && (
            <span className="mx-1 opacity-30 text-xs">·</span>
          )}
        </span>
      ))}
    </nav>
  );
}
