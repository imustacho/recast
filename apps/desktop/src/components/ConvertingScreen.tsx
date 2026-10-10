import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { FormatIcon } from "./FormatIcon";
import { getBasename } from "../lib/formatUtils";
import type { ConversionJob, MediaFile } from "../lib/types";

interface ConvertingScreenProps {
  files: MediaFile[];
  jobs: ConversionJob[];
  targetFormat: string;
  overallProgress: number;
  onCancel?: () => void;
}

export function ConvertingScreen({
  files,
  jobs,
  targetFormat,
  overallProgress,
  onCancel,
}: ConvertingScreenProps) {
  const { t } = useTranslation();

  // Circular progress calculations (radius 58, perimeter ~ 364.4)
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (overallProgress / 100) * circumference;

  return (
    <div className="flex h-full min-h-[500px] w-full flex-col justify-between rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#1E293B] p-6 shadow-sm transition">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <h2 className="text-base font-bold text-slate-900 dark:text-white">{t("converting")}</h2>
      </div>

      {/* Circular Progress Section */}
      <div className="my-6 flex flex-col items-center justify-center text-center">
        <div className="relative mb-5 flex h-36 w-36 items-center justify-center">
          <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 128 128">
            <circle
              cx="64"
              cy="64"
              r={radius}
              stroke="currentColor"
              strokeWidth="10"
              className="text-slate-100 dark:text-slate-800"
              fill="transparent"
            />
            <circle
              cx="64"
              cy="64"
              r={radius}
              stroke="currentColor"
              strokeWidth="10"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="text-emerald-600 dark:text-emerald-400 transition-all duration-300 ease-out"
              fill="transparent"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              {Math.round(overallProgress)}%
            </span>
          </div>
        </div>

        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t("convertingFiles")}</h3>
        <p className="mt-1 max-w-xs text-xs text-slate-400 dark:text-slate-400">{t("convertingHint")}</p>
      </div>

      {/* File conversion queue list */}
      <div className="max-h-64 flex-1 space-y-2.5 overflow-y-auto px-1">
        {files.map((file) => {
          const basename = getBasename(file.path);
          const job = jobs.find((j) => j.inputPath === file.path);
          const isDone = job?.status === "completed";
          const isProcessing = job?.status === "processing" || (!isDone && overallProgress > 0);
          const isFailed = job?.status === "failed";

          return (
            <div
              key={file.path}
              className="rounded-2xl border border-slate-100 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-800/50 p-3.5 transition"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <FormatIcon format={file.detectedFormat} category={file.category} size="sm" />
                  <span className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200" title={basename}>
                    {basename}
                  </span>
                </div>

                <div className="flex shrink-0 items-center gap-1.5 text-xs text-slate-400">
                  <ArrowRight className="h-3 w-3 text-slate-300 dark:text-slate-600" />
                  <span className="font-bold uppercase text-emerald-700 dark:text-emerald-400 font-mono">
                    {targetFormat}
                  </span>
                </div>

                {isDone && (
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                )}
              </div>

              {/* Progress status bar */}
              <div className="mt-2.5">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isFailed
                        ? "bg-red-500"
                        : isDone
                        ? "bg-emerald-600"
                        : isProcessing
                        ? "bg-emerald-500 animate-pulse"
                        : "bg-slate-300 dark:bg-slate-700"
                    }`}
                    style={{
                      width: isDone ? "100%" : isProcessing ? `${job?.progress || 40}%` : "0%",
                    }}
                  />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
                  <span>
                    {isDone
                      ? t("completed")
                      : isFailed
                      ? t("conversionFailed")
                      : isProcessing
                      ? t("converting")
                      : t("waiting")}
                  </span>
                  {job?.progress !== undefined && <span>{job.progress}%</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
