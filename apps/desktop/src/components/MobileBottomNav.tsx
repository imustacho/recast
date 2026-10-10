import { useTranslation } from "react-i18next";
import { Clock, Home } from "lucide-react";

interface MobileBottomNavProps {
  activeTab: "home" | "history" | "settings";
  onSelectTab: (tab: "home" | "history") => void;
}

export function MobileBottomNav({ activeTab, onSelectTab }: MobileBottomNavProps) {
  const { t } = useTranslation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex lg:hidden items-center justify-around border-t border-slate-100 bg-white/95 px-6 py-2.5 backdrop-blur-md pb-safe"
      aria-label="Mobile Navigation"
    >
      <button
        type="button"
        onClick={() => onSelectTab("home")}
        className={`flex flex-col items-center gap-1 transition ${
          activeTab === "home"
            ? "text-emerald-700 font-bold"
            : "text-slate-400 hover:text-slate-600"
        }`}
      >
        <Home className="h-5 w-5" />
        <span className="text-[11px]">{t("home")}</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectTab("history")}
        className={`flex flex-col items-center gap-1 transition ${
          activeTab === "history"
            ? "text-emerald-700 font-bold"
            : "text-slate-400 hover:text-slate-600"
        }`}
      >
        <Clock className="h-5 w-5" />
        <span className="text-[11px]">{t("history")}</span>
      </button>
    </nav>
  );
}
