import { useTranslation } from "react-i18next";
import { Clock, Home, Settings } from "lucide-react";
import recastLogo from "../assets/recast.png?inline";

interface DesktopSidebarProps {
  activeTab: "home" | "history" | "settings";
  onSelectTab: (tab: "home" | "history" | "settings") => void;
}

export function DesktopSidebar({ activeTab, onSelectTab }: DesktopSidebarProps) {
  const { t } = useTranslation();

  const navItems = [
    { id: "home" as const, label: t("home"), icon: Home },
    { id: "history" as const, label: t("history"), icon: Clock },
    { id: "settings" as const, label: t("settings"), icon: Settings },
  ];

  return (
    <aside className="hidden lg:flex w-60 shrink-0 flex-col justify-between py-2 pr-6">
      <div className="space-y-8">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3 px-2">
          <img src={recastLogo} alt="Recast logo" className="h-10 w-10 object-contain drop-shadow-xs" />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Recast</h1>
            <p className="text-[11px] text-slate-400 font-medium">{t("appSubtitle")}</p>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="space-y-1.5" aria-label="Main Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`flex w-full items-center gap-3.5 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  isActive
                    ? "bg-emerald-50 text-emerald-800 shadow-xs"
                    : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? "text-emerald-700" : "text-slate-400"}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer Tagline */}
      <div className="px-3 pb-4">
        <p className="text-xs leading-relaxed text-slate-400 font-medium">
          {t("tagline")}
        </p>
      </div>
    </aside>
  );
}
