import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open } from "@tauri-apps/plugin-dialog";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { availableTargetFormats } from "../../lib/capabilities";
import { useAppStore } from "../../lib/store";
import type {
  ConversionJob,
  ConversionCapabilities,
  ConversionResult,
  EngineStatus,
  LaunchRequest,
  MediaFile,
} from "../../lib/types";

interface InstallProgress {
  line: string;
  percentage?: number;
  phase: string;
}

export function ConvertView() {
  const { t } = useTranslation();
  const launchHandled = useRef(false);
  const [isConverting, setIsConverting] = useState(false);
  const [isInstallingLo, setIsInstallingLo] = useState(false);
  const [installProgress, setInstallProgress] = useState<InstallProgress>();
  const [installLogs, setInstallLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [notice, setNotice] = useState<string>();
  const [error, setError] = useState<string>();
  const [capabilities, setCapabilities] = useState<ConversionCapabilities>();
  const [engineStatus, setEngineStatus] = useState<EngineStatus>();
  const {
    files,
    targetFormat,
    addFiles,
    removeFile,
    clearFiles,
    setTargetFormat,
    addJobs,
    updateJob,
  } = useAppStore();

  const availableFormats = useMemo(
    () => availableTargetFormats(capabilities, files),
    [capabilities, files],
  );
  const formatNames = useMemo(
    () => new Map(capabilities?.formats.map((format) => [format.id, format.displayName]) ?? []),
    [capabilities],
  );

  const hasDocumentFiles = useMemo(
    () => files.some((file) => file.category === "document"),
    [files],
  );

  const categoryNames = useMemo(() => {
    const categories = Array.from(new Set(files.map((file) => file.category)));
    return categories.map((cat) => t(cat, { defaultValue: cat })).join(", ");
  }, [files, t]);

  const incompatibilityNotice = useMemo(() => {
    if (!files.length || availableFormats.length > 0) return null;
    const categories = new Set(files.map((file) => file.category));
    if (categories.size > 1) {
      return t("incompatibleCategoriesNotice", { categories: categoryNames });
    }
    return t("noCompatibleFormatsNotice");
  }, [files, availableFormats, categoryNames, t]);

  const handleDroppedPaths = useEffectEvent(async (paths: string[]) => {
    try {
      await inspectAndAdd(paths);
    } catch (reason) {
      setError(String(reason));
    }
  });

  const handleLaunchRequest = useEffectEvent(async () => {
    const launch = await invoke<LaunchRequest>("get_launch_request");
    if (!launch.paths.length) return;
    const inspected = await inspectAndAdd(launch.paths);
    const format = launch.targetFormat ?? targetFormat;
    if (launch.targetFormat) setTargetFormat(launch.targetFormat);
    if (launch.autoStart) await runConversion(inspected, format);
  });

  useEffect(() => {
    if (!isTauri()) return;
    void invoke<ConversionCapabilities>("get_conversion_capabilities")
      .then(setCapabilities)
      .catch((reason: unknown) => setError(String(reason)));
    void invoke<EngineStatus>("get_engine_status")
      .then(setEngineStatus)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isTauri()) return;
    let unlisten: (() => void) | undefined;
    void listen<InstallProgress>("libreoffice-install-progress", (event) => {
      setInstallProgress(event.payload);
      if (event.payload.line) {
        setInstallLogs((prev) => [...prev.slice(-49), event.payload.line]);
      }
    }).then((stop) => {
      unlisten = stop;
    });
    return () => unlisten?.();
  }, []);

  useEffect(() => {
    if (!availableFormats.includes(targetFormat)) {
      if (availableFormats[0]) setTargetFormat(availableFormats[0]);
    }
  }, [availableFormats, setTargetFormat, targetFormat]);

  useEffect(() => {
    if (!isTauri()) return;
    let unlisten: (() => void) | undefined;
    void getCurrentWindow()
      .onDragDropEvent((event) => {
        if (event.payload.type === "drop") {
          void handleDroppedPaths(event.payload.paths);
        }
      })
      .then((stopListening) => {
        unlisten = stopListening;
      });
    return () => unlisten?.();
  }, [handleDroppedPaths]);

  useEffect(() => {
    if (!isTauri()) return;
    if (launchHandled.current) return;
    launchHandled.current = true;

    void handleLaunchRequest().catch((reason: unknown) => setError(String(reason)));
  }, [handleLaunchRequest]);

  async function inspectAndAdd(paths: string[]) {
    setError(undefined);
    const inspected = await invoke<MediaFile[]>("inspect_files", { paths });
    addFiles(inspected);
    return inspected;
  }

  async function handleSelectFiles() {
    try {
      const selected = await open({ multiple: true });
      if (!selected) return;
      await inspectAndAdd(Array.isArray(selected) ? selected : [selected]);
    } catch (reason) {
      setError(String(reason));
    }
  }

  async function handleOpenWebsite() {
    const url = "https://www.libreoffice.org/download/download-libreoffice/";
    try {
      if (isTauri()) {
        await invoke("open_external_url", { url });
      } else {
        window.open(url, "_blank");
      }
    } catch {
      window.open(url, "_blank");
    }
  }

  async function runConversion(selectedFiles: MediaFile[], format: string) {
    if (!selectedFiles.length || isConverting) return;
    setIsConverting(true);
    setError(undefined);
    setNotice(t("conversionStarted"));

    try {
      const request = {
        inputPaths: selectedFiles.map((file) => file.path),
        targetFormat: format,
        presetId: null,
        outputDirectory: null,
        overwritePolicy: "rename",
        options: {},
      };
      const jobs = await invoke<ConversionJob[]>("queue_conversion", { request });
      addJobs(jobs);
      jobs.forEach((job) =>
        updateJob({ ...job, status: "processing", progress: 20, currentStep: t("converting") }),
      );

      const results = await invoke<ConversionResult[]>("convert_files", { request });
      results.forEach((result) => {
        const job = jobs.find((candidate) => candidate.inputPath === result.inputPath);
        if (!job) return;
        updateJob({
          ...job,
          outputPath: result.outputPath,
          status: result.success ? "completed" : "failed",
          progress: result.success ? 100 : 0,
          currentStep: result.success ? t("completed") : result.error,
        });
      });

      const succeeded = results.filter((result) => result.success).length;
      const failed = results.length - succeeded;
      setNotice(t("conversionSummary", { succeeded, failed }));
      if (failed) {
        setError(results.find((result) => !result.success)?.error ?? t("conversionFailed"));
      }
    } catch (reason) {
      setError(String(reason));
      setNotice(undefined);
    } finally {
      setIsConverting(false);
    }
  }

  async function handleInstallLibreOffice() {
    if (!isTauri() || isInstallingLo) return;
    setIsInstallingLo(true);
    setError(undefined);
    setNotice(t("installing"));
    setInstallLogs([]);
    setInstallProgress(undefined);
    try {
      const msg = await invoke<string>("install_libreoffice");
      const status = await invoke<EngineStatus>("get_engine_status");
      setEngineStatus(status);
      setNotice(msg || t("installedSuccessfully"));
    } catch (reason) {
      setError(String(reason));
      setNotice(undefined);
    } finally {
      setIsInstallingLo(false);
    }
  }

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-6" id="convert">
      <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-white p-10 text-center">
        <p className="text-lg font-medium text-ink">{t("dropFiles")}</p>
        <button
          className="mt-4 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          disabled={isConverting}
          onClick={() => void handleSelectFiles()}
          type="button"
        >
          {t("selectFiles")}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="rounded-2xl bg-white p-4 shadow-sm">
          <span className="mb-2 block text-sm text-slate-500">{t("targetFormat")}</span>
          <select
            className="w-full rounded-xl border border-slate-200 px-3 py-2"
            disabled={!availableFormats.length || isConverting}
            onChange={(event) => setTargetFormat(event.target.value)}
            value={availableFormats.includes(targetFormat) ? targetFormat : (availableFormats[0] ?? "")}
          >
            {!availableFormats.length && (
              <option value="" disabled>
                {t("noCompatibleFormats")}
              </option>
            )}
            {availableFormats.map((format) => (
              <option key={format} value={format}>
                {formatNames.get(format) ?? format.toUpperCase()}
              </option>
            ))}
          </select>
        </label>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-slate-500">
              {t("selectedFiles")} ({files.length})
            </span>
            {files.length > 0 && (
              <button
                className="text-xs font-medium text-red-500 hover:text-red-700 transition"
                disabled={isConverting}
                onClick={clearFiles}
                type="button"
              >
                {t("clearAll")}
              </button>
            )}
          </div>
          <div className="max-h-60 space-y-2 overflow-y-auto">
            {files.map((file) => (
              <div
                className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2"
                key={file.path}
              >
                <span className="truncate text-sm text-slate-700" title={file.path}>
                  {file.path}
                </span>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full bg-accentSoft px-2 py-1 text-xs text-accent">
                    {file.detectedFormat}
                  </span>
                  <button
                    aria-label={t("removeFile")}
                    className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 hover:text-red-600 transition disabled:opacity-50"
                    disabled={isConverting}
                    onClick={() => removeFile(file.path)}
                    title={t("removeFile")}
                    type="button"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
            {!files.length && <p className="text-sm text-slate-400">{t("noFiles")}</p>}
          </div>
        </div>
      </div>

      {incompatibilityNotice && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-medium">⚠️ {incompatibilityNotice}</p>
        </div>
      )}

      {hasDocumentFiles && engineStatus && !engineStatus.libreoffice && (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
          {!isInstallingLo ? (
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold">{t("libreOfficeRequiredTitle")}</p>
                <p className="text-xs text-sky-700">{t("libreOfficeRequiredDesc")}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="rounded-xl bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-700 disabled:opacity-50 transition"
                  onClick={() => void handleInstallLibreOffice()}
                  type="button"
                >
                  {t("installLibreOffice")}
                </button>
                <button
                  className="rounded-xl border border-sky-300 bg-white px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-100 transition"
                  onClick={() => void handleOpenWebsite()}
                  type="button"
                >
                  {t("downloadFromWebsite")}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-sky-600 border-t-transparent" />
                  <p className="font-semibold text-sky-900">
                    {installProgress?.phase === "installing"
                      ? t("installingLibreOffice")
                      : t("downloadingLibreOffice")}
                  </p>
                </div>
                {installProgress?.percentage !== undefined && (
                  <span className="text-xs font-bold text-sky-700">
                    %{installProgress.percentage}
                  </span>
                )}
              </div>

              <div className="h-2 w-full overflow-hidden rounded-full bg-sky-200">
                {installProgress?.percentage !== undefined ? (
                  <div
                    className="h-full bg-sky-600 transition-all duration-300"
                    style={{ width: `${installProgress.percentage}%` }}
                  />
                ) : (
                  <div className="h-full w-2/3 animate-pulse rounded-full bg-sky-600" />
                )}
              </div>

              {installProgress?.line && (
                <p className="truncate rounded-lg border border-sky-200 bg-white/80 px-2.5 py-1.5 font-mono text-xs text-sky-800">
                  &gt; {installProgress.line}
                </p>
              )}

              {installLogs.length > 0 && (
                <div>
                  <button
                    className="text-xs font-medium text-sky-700 hover:text-sky-900 underline"
                    onClick={() => setShowLogs(!showLogs)}
                    type="button"
                  >
                    {showLogs ? t("hideLogs") : t("showLogs")} ({installLogs.length})
                  </button>
                  {showLogs && (
                    <div className="mt-2 max-h-36 overflow-y-auto rounded-lg bg-slate-900 p-2.5 font-mono text-[11px] leading-tight text-slate-200 space-y-1">
                      {installLogs.map((log, index) => (
                        <div key={index} className="truncate">
                          {log}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {notice && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}
      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <button
        className="w-fit rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
        disabled={!files.length || isConverting || !availableFormats.length}
        onClick={() => void runConversion(files, targetFormat)}
        type="button"
      >
        {isConverting ? t("converting") : t("convertNow")}
      </button>
    </section>
  );
}
