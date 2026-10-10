import { useTranslation } from "react-i18next";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { useState } from "react";
import { Clock, FileText, Trash2 } from "lucide-react";
import { useAppStore } from "../../lib/store";
import { getBasename } from "../../lib/formatUtils";

export function QueueView() {
  const { t } = useTranslation();
  const jobs = useAppStore((state) => state.jobs);
  const [openError, setOpenError] = useState<string>();

  const activeCount = jobs.filter(
    (j) => j.status === "processing" || j.status === "pending",
  ).length;

  return (
    <section
      className="min-w-0 rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#1E293B] p-5 shadow-sm transition"
      id="queue"
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h2 className="text-sm font-bold text-slate-800 dark:text-white">{t("queue")}</h2>
          <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            {jobs.length === 0
              ? t("emptyQueue")
              : activeCount > 0
              ? `${activeCount} ${t("converting")}`
              : `${jobs.length} ${t("completed")}`}
          </span>
        </div>

        <div
          onClick={() => {
            if (jobs.length > 0) {
              useAppStore.setState({ jobs: [] });
            }
          }}
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 transition"
          title={t("clearAll")}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </div>
      </div>

      {openError && (
        <p role="alert" className="mb-3 break-words text-xs text-red-600 dark:text-red-400 font-medium">
          {openError}
        </p>
      )}

      {/* Body: Empty State or Active Jobs */}
      {jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="relative mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800/60 text-slate-400 border border-slate-100 dark:border-slate-700">
            <FileText className="h-7 w-7 text-slate-400 dark:text-slate-500" />
            <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-white dark:border-slate-800">
              <Clock className="h-3 w-3 stroke-[2.5]" />
            </div>
          </div>
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{t("noJobsInQueue")}</p>
          <p className="mt-0.5 max-w-[200px] text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
            {t("queuePlaceholder")}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
          {jobs.map((job) => {
            const basename = getBasename(job.inputPath);
            const isCompleted = job.status === "completed";
            const isFailed = job.status === "failed";

            return (
              <div
                className="rounded-2xl border border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/50 p-3.5 transition"
                key={job.id}
              >
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-xs font-bold text-slate-800 dark:text-slate-200" title={basename}>
                    {basename}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      isCompleted
                        ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                        : isFailed
                        ? "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300"
                        : "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                    }`}
                  >
                    {job.status}
                  </span>
                </div>

                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isCompleted ? "bg-emerald-600" : isFailed ? "bg-red-500" : "bg-emerald-500"
                    }`}
                    style={{ width: `${job.progress}%` }}
                  />
                </div>

                {job.currentStep && (
                  <p className="mt-1.5 break-words text-[11px] text-slate-400 dark:text-slate-500">{job.currentStep}</p>
                )}

                {job.outputPath && (
                  <button
                    className="mt-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-300 transition hover:underline"
                    onClick={() => {
                      setOpenError(undefined);
                      void revealItemInDir(job.outputPath!).catch((reason: unknown) =>
                        setOpenError(String(reason)),
                      );
                    }}
                    type="button"
                  >
                    {t("showOutput")}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
