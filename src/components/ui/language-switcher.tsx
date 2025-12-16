"use client";

import { useRouter } from "next/router";
import { useLocale } from "next-intl";
import { locales, localeNames, localeFlags, type Locale } from "@/i18n/config";

interface LanguageSwitcherProps {
  className?: string;
  compact?: boolean;
}

export function LanguageSwitcher({ className = "", compact = false }: LanguageSwitcherProps) {
  const router = useRouter();
  const currentLocale = useLocale() as Locale;

  const handleLocaleChange = (newLocale: Locale) => {
    const { pathname, asPath, query } = router;
    router.push({ pathname, query }, asPath, { locale: newLocale });
  };

  return (
    <div className={`dropdown dropdown-end ${className}`}>
      <label
        tabIndex={0}
        className="btn btn-ghost btn-sm gap-1.5 hover:bg-base-content/5"
      >
        <span className="text-base">{localeFlags[currentLocale]}</span>
        {!compact && (
          <span className="text-sm font-medium hidden sm:inline">
            {localeNames[currentLocale]}
          </span>
        )}
        <span className="icon-[tabler--chevron-down] size-4 opacity-60"></span>
      </label>
      <ul
        tabIndex={0}
        className="dropdown-content z-50 menu p-2 shadow-xl bg-base-100 rounded-xl w-44 border border-base-content/5 mt-2"
      >
        {locales.map((locale) => (
          <li key={locale}>
            <button
              onClick={() => handleLocaleChange(locale)}
              className={`flex items-center gap-2 ${
                currentLocale === locale
                  ? "active bg-primary/10 text-primary"
                  : ""
              }`}
            >
              <span className="text-base">{localeFlags[locale]}</span>
              <span className="flex-1">{localeNames[locale]}</span>
              {currentLocale === locale && (
                <span className="icon-[tabler--check] size-4"></span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
