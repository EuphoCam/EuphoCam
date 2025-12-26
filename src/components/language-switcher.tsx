'use client';

import { useI18n } from '@/hooks/use-i18n';
import type { Locale } from '@/lib/dictionaries';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Languages } from 'lucide-react';

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();

  const languageMap: Record<Locale, string> = {
    en: 'English',
    zh: '中文',
    ja: '日本語',
  };

  return (
    <Select value={locale} onValueChange={(value: Locale) => setLocale(value)}>
      <SelectTrigger className="w-auto gap-2 bg-black/30 hover:bg-black/50 text-primary-foreground border-0 hover:text-white focus:ring-0 focus:ring-offset-0">
        <Languages className="h-5 w-5" />
        <SelectValue placeholder="Language" />
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(languageMap) as Locale[]).map((lang) => (
          <SelectItem key={lang} value={lang}>
            {languageMap[lang]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
