import { useEffect } from "react";
import { DesktopSidebar } from "./components/DesktopSidebar";
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
  const isMobile = useIsMobile(1024);
  const { activeTab, setActiveTab, recentFiles, clearRecentFiles, settings } = useAppStore();

  // Apply Theme effect
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === "dark") {
      root.classList.add("dark");
    } else if (settings.theme === "light") {
      root.classList.remove("dark");
    } else {
      // System theme
      if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
        const isSystemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        if (isSystemDark) {
          root.classList.add("dark");
        } else {
          root.classList.remove("dark");
        }
      }
    }
  }, [settings.theme]);

  // Mobile layout (< 1024px)
  if (isMobile) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-slate-50 text-slate-900 pb-20">
        <MobileHeader
          onOpenSettings={() => setActiveTab(activeTab === "settings" ? "home" : "settings")}
          isSettingsActive={activeTab === "settings"}
        />

        <main className="flex-1 p-4">
          {activeTab === "home" && <ConvertView />}
          {activeTab === "history" && (
            <HistoryScreen
              items={recentFiles}
              onClearList={clearRecentFiles}
              onBack={() => setActiveTab("home")}
            />
          )}
          {activeTab === "settings" && <SettingsScreen onBack={() => setActiveTab("home")} />}
        </main>

        <MobileBottomNav
          activeTab={activeTab}
          onSelectTab={(tab) => setActiveTab(tab)}
        />
      </div>
    );
  }

  // Desktop layout (>= 1024px) - 3 Columns matching Mockup
  return (
    <div className="min-h-screen w-full bg-[#F4F7F6] text-slate-900 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="mx-auto flex min-h-[820px] w-full max-w-[1520px] rounded-[36px] bg-[#F8FAF9] border border-slate-200/80 p-6 shadow-xl shadow-slate-200/50">
        {/* Left Sidebar Navigation */}
        <DesktopSidebar activeTab={activeTab} onSelectTab={setActiveTab} />

        {/* Center Main Work Area */}
        <main className="flex-1 min-w-0 px-6 border-x border-slate-200/60 overflow-y-auto max-h-[800px] no-scrollbar">
          {activeTab === "home" && <ConvertView />}
          {activeTab === "history" && (
            <HistoryScreen items={recentFiles} onClearList={clearRecentFiles} />
          )}
          {activeTab === "settings" && <SettingsScreen />}
        </main>

        {/* Right Sidebar: Queue & Recent Conversions */}
        <aside className="w-84 shrink-0 pl-6 flex flex-col gap-6 overflow-y-auto max-h-[800px] no-scrollbar">
          <QueueView />
          <DesktopRecentPanel />
        </aside>
      </div>
    </div>
  );
}
