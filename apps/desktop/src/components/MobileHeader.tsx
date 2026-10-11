import { Settings } from "lucide-react";
import { Brand } from "./Brand";
import { useTranslation } from "react-i18next";

interface MobileHeaderProps {
  onOpenSettings: () => void;
  isSettingsActive?: boolean;
}

export function MobileHeader({ onOpenSettings, isSettingsActive = false }: MobileHeaderProps) {
  const { t } = useTranslation();
  return (
    <header className="mobile-header">
      <Brand />

      <button
        type="button"
        onClick={onOpenSettings}
        className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
          isSettingsActive
            ? "bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300"
            : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200"
        }`}
        aria-label={t("settings")} aria-pressed={isSettingsActive}
      >
        <Settings className="h-5 w-5" />
      </button>
    </header>
  );
}
