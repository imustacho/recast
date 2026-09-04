import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Globe, Settings } from "lucide-react";
import { QueueView } from "./features/queue/QueueView";
import { ConvertView } from "./features/convert/ConvertView";

export function App() {
  const { t, i18n } = useTranslation();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  const currentLang = i18n.language && i18n.language.startsWith("tr") ? "tr" : "en";

  function handleSelectLanguage(lang: "tr" | "en") {
    void i18n.changeLanguage(lang);
    try {
      localStorage.setItem("recast_language", lang);
    } catch {
      // ignore
    }
    setIsSettingsOpen(false);
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    }
    if (isSettingsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSettingsOpen]);

  return (
    <div className="min-h-screen bg-slate-100 text-ink">
      <main className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 p-5 md:p-8">
        <header className="flex flex-wrap items-end justify-between gap-3 px-1">
          <div className="flex items-center gap-3">
            <img src="/recast.png" alt="Recast logo" className="h-12 w-12 object-contain" />
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Offline-first</p>
              <h1 className="text-3xl font-semibold text-ink">Recast</h1>
            </div>
          </div>

          <div className="relative" ref={settingsRef}>
            <button
              aria-expanded={isSettingsOpen}
              aria-haspopup="true"
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-ink focus:outline-none focus:ring-2 focus:ring-accent/20"
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              title={t("settings")}
              type="button"
            >
              <Settings className="h-5 w-5" />
            </button>

            {isSettingsOpen && (
              <div className="absolute right-0 top-12 z-50 w-56 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2 px-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {t("settings")}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">v0.2.2</span>
                </div>

                <div className="space-y-1">
                  <div className="px-1 py-1 text-xs font-medium text-slate-500 flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-slate-400" />
                    <span>{t("language")}</span>
                  </div>

                  <button
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition ${
                      currentLang === "tr"
                        ? "bg-accentSoft text-accent font-semibold"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                    onClick={() => handleSelectLanguage("tr")}
                    type="button"
                  >
                    <span className="flex items-center gap-2">
                      <span>🇹🇷</span>
                      <span>Türkçe</span>
                    </span>
                    {currentLang === "tr" && <Check className="h-4 w-4 text-accent" />}
                  </button>

                  <button
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition ${
                      currentLang === "en"
                        ? "bg-accentSoft text-accent font-semibold"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                    onClick={() => handleSelectLanguage("en")}
                    type="button"
                  >
                    <span className="flex items-center gap-2">
                      <span>🇺🇸</span>
                      <span>English</span>
                    </span>
                    {currentLang === "en" && <Check className="h-4 w-4 text-accent" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
          <ConvertView />
          <QueueView />
        </div>
      </main>
    </div>
  );
}
