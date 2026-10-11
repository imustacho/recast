import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ChevronRight, Trash2 } from "lucide-react";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { FormatIcon } from "./FormatIcon";
import { formatTimeAgo, getBasename } from "../lib/formatUtils";
import type { RecentConversionItem } from "../lib/types";

interface HistoryScreenProps {
  items: RecentConversionItem[];
  onClearList: () => void;
  onBack?: () => void;
}

export function HistoryScreen({ items, onClearList, onBack }: HistoryScreenProps) {
  const { t, i18n } = useTranslation();
  const [openError, setOpenError] = useState<string>();

  async function handleOpenFile(item: RecentConversionItem) {
    setOpenError(undefined);
    const targetPath = item.outputPath || item.inputPath;
    try {
      await revealItemInDir(targetPath);
    } catch (err) {
      setOpenError(String(err));
    }
  }

  return (
    <div className="flex h-full min-h-[500px] w-full flex-col justify-between surface-card rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 p-6 shadow-sm transition">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
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
            <h2 className="text-base font-bold text-slate-900 dark:text-white">{t("convertedFiles")}</h2>
          </div>

          <span className="rounded-full bg-slate-50 px-3 py-1 text-xs text-slate-500 dark:bg-slate-900">{items.length} {t("files")}</span>
        </div>

        {openError && (
          <p role="alert" className="mt-3 text-xs text-red-600 dark:text-red-400">
            {openError}
          </p>
        )}

        {/* List of converted files */}
        <div className="mt-4 max-h-[460px] space-y-2.5 overflow-y-auto pr-1">
          {items.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-400 dark:text-slate-500">
              {t("noRecentFiles")}
            </div>
          ) : (
            items.map((item) => {
              const basename = getBasename(item.outputPath || item.name);
              const metaText = [
                item.targetFormat.toUpperCase(),
                item.sizeFormatted,
                formatTimeAgo(item.timestamp, i18n.language),
              ]
                .filter(Boolean)
                .join(" • ");

              return (
                <div
                  key={item.id}
                  onClick={() => void handleOpenFile(item)}
                  className="group flex cursor-pointer items-center justify-between rounded-2xl border border-slate-100 dark:border-slate-700/60 bg-white dark:bg-slate-800/40 p-3.5 hover:border-slate-200 dark:hover:border-slate-600 hover:bg-slate-50/70 dark:hover:bg-slate-700/50 transition"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <FormatIcon format={item.targetFormat} category={item.category} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-emerald-800 dark:group-hover:text-emerald-400 transition" title={basename}>
                        {basename}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{metaText}</p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 pl-2 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition">
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Clear List Button */}
      {items.length > 0 && (
        <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
          <button
            type="button"
            onClick={onClearList}
            className="flex w-full items-center justify-center gap-2 rounded-2xl py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-red-600 dark:hover:text-red-400 transition"
          >
            <Trash2 className="h-4 w-4" />
            <span>{t("clearList")}</span>
          </button>
        </div>
      )}
    </div>
  );
}
