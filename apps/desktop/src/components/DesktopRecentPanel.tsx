import { useTranslation } from "react-i18next";
import { Clock, ChevronRight } from "lucide-react";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { useState } from "react";
import { FormatIcon } from "./FormatIcon";
import { formatTimeAgo, getBasename } from "../lib/formatUtils";
import { useAppStore } from "../lib/store";

export function DesktopRecentPanel() {
  const { t, i18n } = useTranslation();
  const { recentFiles, setActiveTab } = useAppStore();
  const [openError, setOpenError] = useState<string>();

  async function handleOpenFile(path: string) {
    setOpenError(undefined);
    try {
      await revealItemInDir(path);
    } catch (err) {
      setOpenError(String(err));
    }
  }

  return (
    <div className="surface-card rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 p-5 shadow-sm transition">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">{t("recent")}</h3>
        </div>
        <button type="button" onClick={() => setActiveTab("history")} className="flex items-center gap-1 text-xs font-medium text-accent dark:text-emerald-300">{t("viewAll")}<ChevronRight className="h-3 w-3" /></button>
      </div>

      {openError && (
        <p role="alert" className="mb-2 text-xs text-red-600 dark:text-red-400">
          {openError}
        </p>
      )}

      {/* List */}
      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
        {recentFiles.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">{t("noRecentFiles")}</p>
        ) : (
          recentFiles.slice(0, 10).map((item) => {
            const basename = getBasename(item.outputPath || item.name);
            const metaText = [item.targetFormat.toUpperCase(), item.sizeFormatted]
              .filter(Boolean)
              .join(" • ");

            return (
              <button type="button"
                key={item.id}
                onClick={() => void handleOpenFile(item.outputPath || item.inputPath)}
                className="group flex w-full text-left items-center justify-between rounded-2xl border border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/50 p-3 hover:border-slate-200 dark:hover:border-slate-600 hover:bg-slate-100/70 dark:hover:bg-slate-700/50 transition"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <FormatIcon format={item.targetFormat} category={item.category} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-800 dark:group-hover:text-emerald-400 transition" title={basename}>
                      {basename}
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">{metaText}</p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2 pl-2 text-right">
                  <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                    {formatTimeAgo(item.timestamp, i18n.language)}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition" />
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
