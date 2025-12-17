"use client";

import { useRouter } from "next/router";
import { useLocale } from "next-intl";
import { locales, localeNames, localeFlags, type Locale } from "@/i18n/config";

interface LanguageSelectProps {
  className?: string;
}

export function LanguageSelect({ className = "" }: LanguageSelectProps) {
  const router = useRouter();
  const currentLocale = useLocale() as Locale;

  const handleLocaleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocale = e.target.value as Locale;
    const { pathname, asPath, query } = router;
    router.push({ pathname, query }, asPath, { locale: newLocale });
  };

  return (
    <select
      value={currentLocale}
      onChange={handleLocaleChange}
      className={`select select-bordered w-full bg-base-100 focus:bg-base-100 transition-colors ${className}`}
    >
      {locales.map((locale) => (
        <option key={locale} value={locale}>
          {localeFlags[locale]} {localeNames[locale]}
        </option>
      ))}
    </select>
  );
}
