import { describe, expect, it } from 'vitest';

import { detectLanguage, dictionaries } from './dictionaries';
import { interpolate } from './provider';

describe('dictionaries', () => {
  it('defines the same keys for every language', () => {
    const reference = Object.keys(dictionaries.ru).sort();
    for (const [code, dictionary] of Object.entries(dictionaries)) {
      expect(Object.keys(dictionary).sort(), `dictionary ${code}`).toEqual(reference);
    }
  });

  it('has no empty translations', () => {
    for (const [code, dictionary] of Object.entries(dictionaries)) {
      for (const [key, value] of Object.entries(dictionary)) {
        expect(value.trim(), `${code}.${key}`).not.toBe('');
      }
    }
  });

  it('keeps placeholders identical across languages', () => {
    const placeholders = (text: string) =>
      (text.match(/\{\w+\}/g) ?? []).sort().join(',');

    for (const key of Object.keys(dictionaries.ru) as Array<keyof typeof dictionaries.ru>) {
      const ru = placeholders(dictionaries.ru[key]);
      const kg = placeholders(dictionaries.kg[key]);
      expect(kg, `placeholders for ${key}`).toBe(ru);
    }
  });
});

describe('detectLanguage', () => {
  it('picks Russian for a Russian browser', () => {
    expect(detectLanguage('ru-RU')).toBe('ru');
    expect(detectLanguage('ru')).toBe('ru');
  });

  it('defaults to Kyrgyz, the language of the source documents', () => {
    expect(detectLanguage('ky-KG')).toBe('kg');
    expect(detectLanguage('kg')).toBe('kg');
    expect(detectLanguage('en-US')).toBe('kg');
    expect(detectLanguage('')).toBe('kg');
  });
});

describe('interpolate', () => {
  it('substitutes named values', () => {
    expect(interpolate('{n}-версия', { n: 3 })).toBe('3-версия');
  });

  it('leaves unknown placeholders untouched instead of printing undefined', () => {
    expect(interpolate('a {x} b', { y: 1 })).toBe('a {x} b');
  });

  it('returns the template when no values are given', () => {
    expect(interpolate('a {x} b')).toBe('a {x} b');
  });
});
