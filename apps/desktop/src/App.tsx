import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { DesktopRecentPanel } from "./components/DesktopRecentPanel";
import { MobileHeader } from "./components/MobileHeader";
import { MobileBottomNav } from "./components/MobileBottomNav";
import { HistoryScreen } from "./components/HistoryScreen";
import { SettingsScreen } from "./components/SettingsScreen";
import { ConvertView } from "./features/convert/ConvertView";
import { QueueView } from "./features/queue/QueueView";
import { useAppStore } from "./lib/store";
import { useIsMobile } from "./lib/useIsMobile";

export function App() {
  const { t } = useTranslation();
  const isMobile = useIsMobile(1024);
  const { activeTab, setActiveTab, recentFiles, clearRecentFiles, settings } = useAppStore();

  // Apply Theme effect
  useEffect(() => {
    const root = document.documentElement;

    function applySystemTheme() {
      if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
        const isSystemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        if (isSystemDark) {
          root.classList.add("dark");
        } else {
          root.classList.remove("dark");
        }
      }
    }

    if (settings.theme === "dark") {
      root.classList.add("dark");
    } else if (settings.theme === "light") {
      root.classList.remove("dark");
    } else {
      applySystemTheme();
      if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const handler = () => applySystemTheme();
        mediaQuery.addEventListener("change", handler);
        return () => mediaQuery.removeEventListener("change", handler);
      }
    }
  }, [settings.theme]);

  const content = <>
    {activeTab === "home" && <ConvertView />}
    {activeTab === "history" && <HistoryScreen items={recentFiles} onClearList={clearRecentFiles} onBack={() => setActiveTab("home")} />}
    {activeTab === "settings" && <SettingsScreen onBack={() => setActiveTab("home")} />}
  </>;
  return (
    <div className="app-shell">
      {isMobile && <MobileHeader onOpenSettings={() => setActiveTab(activeTab === "settings" ? "home" : "settings")} isSettingsActive={activeTab === "settings"} />}
      <div className={"workspace " + (activeTab === "home" ? "workspace-home" : "workspace-page")}>
        <main className="min-w-0">{content}</main>
        {activeTab === "home" && <aside className="activity-panel">
          {!isMobile && <QueueView />}
          <DesktopRecentPanel />
          <div className="batch-tip"><h3>{t("batchTipTitle")}</h3><p>{t("batchTipDescription")}</p></div>
        </aside>}
      </div>
      {isMobile && <MobileBottomNav activeTab={activeTab} onSelectTab={setActiveTab} />}
    </div>
  );
}
