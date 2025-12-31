'use client';

import { useI18n } from '@/hooks/use-i18n';
import type { Locale } from '@/lib/dictionaries';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Languages } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LanguageSwitcherProps {
  className?: string;
}

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { locale, setLocale } = useI18n();

  const languageMap: Record<Locale, string> = {
    en: 'English',
    'zh-CN': '简体中文',
    'zh-TW': '繁體中文',
    ja: '日本語',
  };

  return (
    <Select value={locale} onValueChange={(value: Locale) => setLocale(value)}>
      <SelectTrigger className={cn("w-auto gap-2 bg-transparent border-0 focus:ring-0 focus:ring-offset-0", className)}>
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
