import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enCommon from "../locales/en/common.json";
import trCommon from "../locales/tr/common.json";
import deCommon from "../locales/de/common.json";
import esCommon from "../locales/es/common.json";
import frCommon from "../locales/fr/common.json";
import itCommon from "../locales/it/common.json";
import ruCommon from "../locales/ru/common.json";
import zhCommon from "../locales/zh/common.json";
import jaCommon from "../locales/ja/common.json";
import koCommon from "../locales/ko/common.json";
import type { SupportedLanguage } from "./types";

const SUPPORTED_LANGUAGES: SupportedLanguage[] = ["en", "tr", "de", "es", "fr", "it", "ru", "zh", "ja", "ko"];

function getInitialLanguage(): SupportedLanguage {
  try {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("recast_language");
      if (saved && SUPPORTED_LANGUAGES.includes(saved as SupportedLanguage)) {
        return saved as SupportedLanguage;
      }
    }
  } catch {
    // Ignore storage access errors
  }
  return "en";
}

void i18n.use(initReactI18next).init({
  lng: getInitialLanguage(),
  fallbackLng: "en",
  resources: {
    en: { translation: enCommon },
    tr: { translation: trCommon },
    de: { translation: deCommon },
    es: { translation: esCommon },
    fr: { translation: frCommon },
    it: { translation: itCommon },
    ru: { translation: ruCommon },
    zh: { translation: zhCommon },
    ja: { translation: jaCommon },
    ko: { translation: koCommon },
  },
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
