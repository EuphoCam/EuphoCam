
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { dictionaries, type Locale } from '@/lib/dictionaries';

type Dictionary = typeof dictionaries['en'];

type I18nContextType = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: keyof Dictionary | string) => string;
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>('en');

  useEffect(() => {
    const browserLang = navigator.language.toLowerCase();
    let detectedLocale: Locale = 'en';

    if (browserLang.startsWith('zh')) {
        if (browserLang === 'zh-cn' || browserLang === 'zh-sg') {
            detectedLocale = 'zh-CN';
        } else if (browserLang === 'zh-tw' || browserLang === 'zh-hk') {
            detectedLocale = 'zh-TW';
        } else {
            detectedLocale = 'zh-CN';
        }
    } else if (browserLang.startsWith('ja')) {
        detectedLocale = 'ja';
    }

    if (Object.keys(dictionaries).includes(detectedLocale)) {
      setLocale(detectedLocale);
    }
  }, []);

  const t = useCallback((key: keyof Dictionary | string) => {
    const dictionary = dictionaries[locale] || dictionaries['en'];
    const translation = (dictionary as any)[key] || dictionaries['en'][key as keyof Dictionary] || key;
    return translation;
  }, [locale]);

  const value = { locale, setLocale, t };

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
