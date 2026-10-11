import { useTranslation } from "react-i18next";
import { Clock, Home, Settings, ShieldCheck } from "lucide-react";
import { Brand } from "./Brand";
interface DesktopSidebarProps {
  activeTab: "home" | "history" | "settings";
  onSelectTab: (tab: "home" | "history" | "settings") => void;
}
export function DesktopSidebar({ activeTab, onSelectTab }: DesktopSidebarProps) {
  const { t } = useTranslation();
  const items = [
    { id: "home" as const, label: t("home"), icon: Home },
    { id: "history" as const, label: t("history"), icon: Clock },
    { id: "settings" as const, label: t("settings"), icon: Settings },
  ];
  return <header className="desktop-header">
    <Brand />
    <nav className="flex items-center gap-1 rounded-2xl bg-slate-50 p-1.5 dark:bg-slate-800" aria-label="Main Navigation">
      {items.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => onSelectTab(id)} aria-current={activeTab === id ? "page" : undefined}
        className={"flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition " + (activeTab === id ? "bg-accentSoft text-accent dark:bg-emerald-950 dark:text-emerald-300" : "text-slate-500 hover:bg-white dark:hover:bg-slate-700")}>
        <Icon className="h-4 w-4" /><span>{label}</span>
      </button>)}
    </nav>
    <span className="flex items-center justify-end gap-2 text-xs text-slate-500"><ShieldCheck className="h-4 w-4 text-accent" />{t("offlineReady")}</span>
  </header>;
}
