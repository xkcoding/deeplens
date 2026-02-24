import en from "./en.json";
import zh from "./zh.json";

export type Locale = "en" | "zh";
export type Translations = typeof en;

const translations: Record<Locale, Translations> = { en, zh };

export function getTranslations(lang: Locale): Translations {
  return translations[lang];
}

export function getAlternateLocale(lang: Locale): Locale {
  return lang === "en" ? "zh" : "en";
}

export function getLocalePath(lang: Locale): string {
  return `/${lang}/`;
}
