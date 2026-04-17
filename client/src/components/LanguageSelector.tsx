interface LanguageSelectorProps {
  selectedLang: string;
  onLangChange: (lang: string) => void;
  t: (key: string, lang: string) => string;
}

const SUPPORTED_LANGUAGES = [
  { code: 'zh-CN', name: '中文' },
  { code: 'en', name: 'English' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'es', name: 'Español' },
];

export default function LanguageSelector({ selectedLang, onLangChange, t }: LanguageSelectorProps) {
  return (
    <select
      className="language-selector"
      value={selectedLang}
      onChange={(e) => onLangChange(e.target.value)}
      aria-label={t('lang.label', selectedLang)}
    >
      {SUPPORTED_LANGUAGES.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.name}
        </option>
      ))}
    </select>
  );
}
