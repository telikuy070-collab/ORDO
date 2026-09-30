import { languages, type LanguageOption } from './dictionaries';
import { useI18n } from './provider';

export interface LanguageSwitcherProps {
  className?: string;
  /**
   * Renders the active language name. The second parameter is the language the
   * label is written in, so a Kyrgyz speaker sees "Русский" in Latin script
   * only if that is how it is spelled; keeping the label in the target language
   * is clearer for people who cannot read the current one.
   */
  showLabel?: boolean;
}

/**
 * Compact two-option language switch.
 *
 * Deliberately not a dropdown: there are exactly two languages, and a person
 * should be able to change the interface in one click without opening a menu.
 */
export function LanguageSwitcher({ className, showLabel = true }: LanguageSwitcherProps) {
  const { language, setLanguage, t } = useI18n();

  return (
    <div
      className={`flex items-center gap-1 ${className ?? ''}`}
      role="group"
      aria-label={t('lang.switch')}
    >
      {languages.map(({ code, labelKey }: LanguageOption) => {
        const active = code === language;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLanguage(code)}
            aria-pressed={active}
            title={t(labelKey)}
            className={[
              'rounded px-2 py-1 text-sm transition-colors',
              active
                ? 'bg-brand-500 text-white font-medium'
                : 'text-text-secondary hover:bg-surface-muted hover:text-text-primary',
            ].join(' ')}
          >
            {showLabel ? t(labelKey) : code.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
