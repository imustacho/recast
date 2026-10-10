import { useTranslation } from "react-i18next";
import { ArrowLeft, Check, ChevronRight, Globe, Moon, Sun } from "lucide-react";
import { useState } from "react";
import recastLogo from "../assets/recast.png?inline";
import { useAppStore } from "../lib/store";

interface SettingsScreenProps {
  onBack?: () => void;
}

export function SettingsScreen({ onBack }: SettingsScreenProps) {
  const { t, i18n } = useTranslation();
  const { settings, updateSettings } = useAppStore();
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);

  const currentLang = i18n.language && i18n.language.startsWith("tr") ? "tr" : "en";

  function handleSelectLanguage(lang: "tr" | "en") {
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
    <div className="flex h-full min-h-[500px] w-full flex-col justify-between rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#1E293B] p-6 shadow-sm transition">
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
                <span>{currentLang === "tr" ? "Türkçe" : "English"}</span>
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>

            {showLanguagePicker && (
              <div className="border-t border-slate-100 dark:border-slate-700/60 bg-white dark:bg-slate-800 p-2 space-y-1">
                <button
                  type="button"
                  onClick={() => handleSelectLanguage("en")}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                >
                  <span className="flex items-center gap-2">
                    <span>🇺🇸</span>
                    <span>English</span>
                  </span>
                  {currentLang === "en" && <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectLanguage("tr")}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                >
                  <span className="flex items-center gap-2">
                    <span>🇹🇷</span>
                    <span>Türkçe</span>
                  </span>
                  {currentLang === "tr" && <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
                </button>
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
              <span className="font-mono text-xs text-slate-400 dark:text-slate-500">0.2.2</span>
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
        <div className="flex items-center gap-2">
          <img src={recastLogo} alt="Recast" className="h-6 w-6 object-contain" />
          <span className="text-sm font-bold text-slate-800 dark:text-white">Recast</span>
        </div>
        <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">{t("appSubtitle")}</p>
      </div>
    </div>
  );
}
