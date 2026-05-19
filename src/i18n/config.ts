export const locales = ["en", "pl", "hu", "de", "es", "ru"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeNames: Record<Locale, string> = {
  en: "English",
  pl: "Polski",
  hu: "Magyar",
  de: "Deutsch",
  es: "Español",
  ru: "Русский",
};

export const localeFlags: Record<Locale, string> = {
  en: "🇬🇧",
  pl: "🇵🇱",
  hu: "🇭🇺",
  de: "🇩🇪",
  es: "🇪🇸",
  ru: "🇷🇺",
};
