"use client";

import { useI18n } from '@/context/I18nContext';

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  const languages = [
    { code: 'en' as const, name: 'English', flag: '🇺🇸' },
    { code: 'es' as const, name: 'Español', flag: '🇪🇸' }
  ];

  return (
    <select 
      value={locale} 
      onChange={(e) => setLocale(e.target.value as 'en' | 'es')}
      className="language-switcher"
      aria-label={t('common.selectLanguage')}
    >
      {languages.map(lang => (
        <option key={lang.code} value={lang.code}>
          {lang.flag} {lang.name}
        </option>
      ))}
    </select>
  );
}
