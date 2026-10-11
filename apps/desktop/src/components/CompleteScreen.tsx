import { useTranslation } from "react-i18next";
import { ArrowRight, Check } from "lucide-react";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { useState } from "react";
import { FormatIcon } from "./FormatIcon";
import { getBasename } from "../lib/formatUtils";
import type { ConversionJob } from "../lib/types";

interface CompleteScreenProps {
  completedJobs: ConversionJob[];
  targetFormat: string;
  onConvertMore: () => void;
}

export function CompleteScreen({
  completedJobs,
  targetFormat,
  onConvertMore,
}: CompleteScreenProps) {
  const { t } = useTranslation();
  const [openError, setOpenError] = useState<string>();

  const successfulJobs = completedJobs.filter((j) => j.status === "completed" && j.outputPath);

  async function handleViewFiles() {
    setOpenError(undefined);
    if (!successfulJobs.length) return;
    try {
      // Reveal the first converted output file
      const firstPath = successfulJobs[0].outputPath;
      if (firstPath) {
        await revealItemInDir(firstPath);
      }
    } catch (err) {
      setOpenError(String(err));
    }
  }

  return (
    <div className="flex h-full min-h-[500px] w-full flex-col justify-between surface-card rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 p-6 shadow-sm transition">
      <div className="my-auto flex flex-col items-center text-center">
        {/* Celebration Badge with particle dots */}
        <div className="relative mb-5 flex h-24 w-24 items-center justify-center">
          {/* Confetti particles */}
          <span className="absolute -top-1 left-3 h-2 w-2 rounded-full bg-amber-400" />
          <span className="absolute -top-3 right-6 h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span className="absolute top-2 -right-1 h-2 w-2 rounded-full bg-teal-400" />
          <span className="absolute bottom-2 -left-2 h-1.5 w-1.5 rounded-full bg-rose-400" />
          <span className="absolute -bottom-2 right-4 h-2 w-2 rounded-full bg-sky-400" />
          <span className="absolute bottom-6 -right-2 h-1.5 w-1.5 rounded-full bg-purple-400" />

          {/* Central Green Badge */}
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 shadow-inner">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/30">
              <Check className="h-8 w-8 stroke-[3]" />
            </div>
          </div>
        </div>

        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t("conversionComplete")}</h2>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-400">{t("conversionCompleteDesc")}</p>

        {openError && (
          <p role="alert" className="mt-3 text-xs text-red-600 dark:text-red-400">
            {openError}
          </p>
        )}

        {/* Files summary list */}
        <div className="mt-6 w-full max-w-sm rounded-2xl border border-slate-100 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-800/50 p-4 text-left">
          <p className="mb-3 text-xs font-bold text-slate-700 dark:text-slate-200">
            {t("filesConverted", { count: completedJobs.length })}
          </p>

          <div className="max-h-40 space-y-2 overflow-y-auto pr-1">
            {completedJobs.map((job) => {
              const basename = getBasename(job.inputPath);
              const isDone = job.status === "completed";

              return (
                <div
                  key={job.id}
                  className="flex items-center justify-between rounded-xl bg-white dark:bg-slate-800 p-2.5 shadow-xs"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <FormatIcon format={job.sourceFormat || targetFormat} size="sm" />
                    <span className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200" title={basename}>
                      {basename}
                    </span>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <ArrowRight className="h-3 w-3 text-slate-300 dark:text-slate-600" />
                    <span className="text-[11px] font-bold uppercase text-emerald-700 dark:text-emerald-400 font-mono">
                      {job.targetFormat}
                    </span>
                    {isDone ? (
                      <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
                    ) : (
                      <span className="text-xs text-red-500">✕</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex flex-col gap-2.5">
        <button
          type="button"
          onClick={() => void handleViewFiles()}
          className="w-full rounded-xl bg-emerald-700 dark:bg-emerald-600 py-3 text-sm font-bold text-white shadow-md shadow-emerald-700/20 hover:bg-emerald-800 dark:hover:bg-emerald-500 transition active:scale-[0.98]"
        >
          {t("viewFiles")}
        </button>

        <button
          type="button"
          onClick={onConvertMore}
          className="w-full rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition active:scale-[0.98]"
        >
          {t("convertMore")}
        </button>
      </div>
    </div>
  );
}
