import { kg } from './kg';
import { ru, type Dictionary, type TranslationKey } from './ru';

export type Language = 'kg' | 'ru';

export const dictionaries: Record<Language, Dictionary> = { kg, ru };

export interface LanguageOption {
  code: Language;
  labelKey: TranslationKey;
}

export const languages: LanguageOption[] = [
  { code: 'kg', labelKey: 'lang.kg' },
  { code: 'ru', labelKey: 'lang.ru' },
];

/**
 * Picks a language from the browser preferences.
 *
 * Kyrgyz is the default rather than English: the product is sold to Kyrgyz
 * colleges and the source documents are in Kyrgyz, so an unmapped browser
 * should land on the language of the people using it.
 */
export function detectLanguage(navigatorLanguage?: string): Language {
  const raw =
    navigatorLanguage ??
    (typeof navigator !== 'undefined' ? navigator.language : undefined) ??
    '';
  return raw.toLowerCase().startsWith('ru') ? 'ru' : 'kg';
}
