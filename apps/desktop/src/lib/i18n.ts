import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enCommon from "../locales/en/common.json";
import trCommon from "../locales/tr/common.json";

function getInitialLanguage(): string {
  try {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("recast_language");
      if (saved === "tr" || saved === "en") return saved;
      if (navigator.language && navigator.language.toLowerCase().startsWith("tr")) {
        return "tr";
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
  },
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;

