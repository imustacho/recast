import { useTranslation } from "react-i18next";
import { ArrowLeft, Check, ChevronRight, Globe, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { Brand } from "./Brand";
import { useAppStore } from "../lib/store";
import type { SupportedLanguage } from "../lib/types";

interface SettingsScreenProps {
  onBack?: () => void;
}

const LANGUAGES: { code: SupportedLanguage; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "tr", label: "Türkçe", flag: "🇹🇷" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "ko", label: "한국어", flag: "🇰🇷" },
];

export function SettingsScreen({ onBack }: SettingsScreenProps) {
  const { t, i18n } = useTranslation();
  const { settings, updateSettings } = useAppStore();
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);

  const activeCode = (i18n.language && (i18n.language.slice(0, 2) as SupportedLanguage)) || "en";
  const currentLang = LANGUAGES.find((l) => l.code === activeCode) || LANGUAGES[0];

  function handleSelectLanguage(lang: SupportedLanguage) {
    void i18n.changeLanguage(lang);
    try {
      localStorage.setItem("recast_language", lang);
    } catch {
      // Ignore
    }
    updateSettings({ language: lang });
    setShowLanguagePicker(false);
  }

  function handleSelectTheme(theme: "system" | "light" | "dark") {
    updateSettings({ theme });
    setShowThemePicker(false);
  }

  return (
    <div className="flex h-full min-h-[500px] w-full flex-col justify-between surface-card rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 p-6 shadow-sm transition">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <h2 className="text-base font-bold text-slate-900 dark:text-white">{t("settings")}</h2>
        </div>

        {/* General Section */}
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {t("general")}
          </h3>
          <div className="overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/40">
            {/* Theme row */}
            <div
              onClick={() => setShowThemePicker(!showThemePicker)}
              className="flex cursor-pointer items-center justify-between border-b border-slate-100 dark:border-slate-700/60 p-3.5 hover:bg-slate-100/70 dark:hover:bg-slate-700/50 transition"
            >
              <div className="flex items-center gap-3">
                {settings.theme === "dark" ? (
                  <Moon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                ) : (
                  <Sun className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                )}
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t("theme")}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                <span className="capitalize">
                  {settings.theme === "system"
                    ? t("themeSystem")
                    : settings.theme === "light"
                    ? t("themeLight")
                    : t("themeDark")}
                </span>
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>

            {showThemePicker && (
              <div className="border-b border-slate-100 dark:border-slate-700/60 bg-white dark:bg-slate-800 p-2 space-y-1">
                {(["system", "light", "dark"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => handleSelectTheme(mode)}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                  >
                    <span className="capitalize">
                      {mode === "system"
                        ? t("themeSystem")
                        : mode === "light"
                        ? t("themeLight")
                        : t("themeDark")}
                    </span>
                    {settings.theme === mode && <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
                  </button>
                ))}
              </div>
            )}

            {/* Language row */}
            <div
              onClick={() => setShowLanguagePicker(!showLanguagePicker)}
              className="flex cursor-pointer items-center justify-between p-3.5 hover:bg-slate-100/70 dark:hover:bg-slate-700/50 transition"
            >
              <div className="flex items-center gap-3">
                <Globe className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t("language")}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                <span className="flex items-center gap-1">
                  <span>{currentLang.flag}</span>
                  <span>{currentLang.label}</span>
                </span>
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>

            {showLanguagePicker && (
              <div className="border-t border-slate-100 dark:border-slate-700/60 bg-white dark:bg-slate-800 p-2 space-y-1 max-h-56 overflow-y-auto">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleSelectLanguage(lang.code)}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                  >
                    <span className="flex items-center gap-2">
                      <span>{lang.flag}</span>
                      <span>{lang.label}</span>
                    </span>
                    {activeCode === lang.code && (
                      <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Conversion Section */}
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {t("conversion")}
          </h3>
          <div className="overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/40">
            {/* Output folder row */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 p-3.5">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t("outputFolder")}</span>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                <span>{settings.outputFolder || t("defaultOutputFolder")}</span>
              </div>
            </div>

            {/* Keep originals toggle */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 p-3.5">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t("keepOriginalFiles")}</span>
              <button
                type="button"
                onClick={() => updateSettings({ keepOriginals: !settings.keepOriginals })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.keepOriginals ? "bg-emerald-600 dark:bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                    settings.keepOriginals ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Overwrite existing toggle */}
            <div className="flex items-center justify-between p-3.5">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {t("overwriteExistingFiles")}
              </span>
              <button
                type="button"
                onClick={() => updateSettings({ overwriteExisting: !settings.overwriteExisting })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.overwriteExisting ? "bg-emerald-600 dark:bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                    settings.overwriteExisting ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* About Section */}
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {t("about")}
          </h3>
          <div className="overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/40">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 p-3.5">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t("version")}</span>
              <span className="font-mono text-xs text-slate-400 dark:text-slate-500">3.0.0</span>
            </div>
            <div className="flex items-center justify-between p-3.5">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t("license")}</span>
              <span className="font-mono text-xs text-slate-400 dark:text-slate-500">MIT</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recast branding footer */}
      <div className="mt-8 flex flex-col items-center justify-center pb-2 text-center">
        <Brand />
        <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">{t("appSubtitle")}</p>
      </div>
    </div>
  );
}
