import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  detectLanguage,
  dictionaries,
  type Language,
} from './dictionaries';
import type { TranslationKey } from './dictionaries/ru';

const STORAGE_KEY = 'ordo.lang';

export interface I18nState {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
  /** Picks the first available key, so a screen can be translated in parts. */
  tOf: <T extends string>(map: Partial<Record<Language, T>>) => T | string;
}

const I18nContext = createContext<I18nState | null>(null);

/** Fills `{name}` placeholders; a missing key returns the key itself so the
 * gap is visible during development instead of rendering an empty string. */
export function interpolate(
  template: string,
  values?: Record<string, string | number>,
): string {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match,
  );
}

function readStoredLanguage(): Language | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'kg' || stored === 'ru' ? stored : null;
  } catch {
    // Private browsing or blocked storage: fall back to detection.
    return null;
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(
    () => readStoredLanguage() ?? detectLanguage(),
  );

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Persisting the choice is best effort; the UI still switches.
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = next;
    }
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  const value = useMemo<I18nState>(() => {
    const dictionary = dictionaries[language];
    return {
      language,
      setLanguage,
      t: (key, values) => {
        const template = dictionary[key];
        return template === undefined ? key : interpolate(template, values);
      },
      tOf: (map) => map[language] ?? map.kg ?? map.ru ?? '',
    };
  }, [language, setLanguage]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nState {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used inside an I18nProvider');
  }
  return ctx;
}
