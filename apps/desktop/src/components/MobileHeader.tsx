import { Settings } from "lucide-react";
import recastLogo from "../assets/recast.png?inline";

interface MobileHeaderProps {
  onOpenSettings: () => void;
  isSettingsActive?: boolean;
}

export function MobileHeader({ onOpenSettings, isSettingsActive = false }: MobileHeaderProps) {
  return (
    <header className="flex lg:hidden items-center justify-between px-4 py-3 bg-white/80 dark:bg-[#0F172A]/90 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 sticky top-0 z-40 transition-colors">
      <div className="flex items-center gap-2.5">
        <img src={recastLogo} alt="Recast logo" className="h-8 w-8 object-contain" />
        <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">Recast</span>
      </div>

      <button
        type="button"
        onClick={onOpenSettings}
        className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
          isSettingsActive
            ? "bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300"
            : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200"
        }`}
        aria-label="Settings"
      >
        <Settings className="h-5 w-5" />
      </button>
    </header>
  );
}
