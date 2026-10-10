import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open } from "@tauri-apps/plugin-dialog";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  ChevronDown,
  FileText,
  FolderOpen,
  RefreshCw,
  UploadCloud,
} from "lucide-react";
import { availableTargetFormats } from "../../lib/capabilities";
import { FALLBACK_CAPABILITIES, getFormatMeta } from "../../lib/formatMeta";
import { getBasename } from "../../lib/formatUtils";
import { useAppStore } from "../../lib/store";
import { FormatIcon } from "../../components/FormatIcon";
import { QuickFormatsBar } from "../../components/QuickFormatsBar";
import { TargetFormatModal } from "../../components/TargetFormatModal";
import { SelectFilesModal } from "../../components/SelectFilesModal";
import { ConvertingScreen } from "../../components/ConvertingScreen";
import { CompleteScreen } from "../../components/CompleteScreen";
import type {
  ConversionCapabilities,
  ConversionJob,
  ConversionResult,
  EngineStatus,
  LaunchRequest,
  MediaCategory,
  MediaFile,
  RecentConversionItem,
} from "../../lib/types";

interface InstallProgress {
  line: string;
  percentage?: number;
  phase: string;
}

export function ConvertView() {
  const { t } = useTranslation();
  const launchHandled = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isInstallingLo, setIsInstallingLo] = useState(false);
  const [installProgress, setInstallProgress] = useState<InstallProgress>();
  const [installLogs, setInstallLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [notice, setNotice] = useState<string>();
  const [error, setError] = useState<string>();
  const [capabilities, setCapabilities] = useState<ConversionCapabilities>(FALLBACK_CAPABILITIES);
  const [engineStatus, setEngineStatus] = useState<EngineStatus>();
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Modal visibility states
  const [isFormatModalOpen, setIsFormatModalOpen] = useState(false);
  const [isFilesModalOpen, setIsFilesModalOpen] = useState(false);

  const {
    files,
    jobs,
    targetFormat,
    conversionState,
    overallProgress,
    completedJobs,
    settings,
    addFiles,
    removeFile,
    clearFiles,
    setTargetFormat,
    addJobs,
    updateJob,
    addRecentFiles,
    setConversionState,
    setOverallProgress,
    setCompletedJobs,
  } = useAppStore();

  const isConverting = conversionState === "converting";

  const availableFormats = useMemo(
    () => availableTargetFormats(capabilities, files),
    [capabilities, files],
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
    try {
      const launch = await invoke<LaunchRequest>("get_launch_request");
      if (!launch.paths.length) return;
      const inspected = await inspectAndAdd(launch.paths);
      const format = launch.targetFormat ?? targetFormat;
      if (launch.targetFormat) setTargetFormat(launch.targetFormat);
      if (launch.autoStart) await runConversion(inspected, format);
    } catch {
      // Ignore launch request failure
    }
  });

  useEffect(() => {
    if (!isTauri()) return;
    void invoke<ConversionCapabilities>("get_conversion_capabilities")
      .then((caps) => {
        if (caps && caps.formats && caps.formats.length > 0) {
          setCapabilities(caps);
        }
      })
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
    if (availableFormats.length > 0 && !availableFormats.includes(targetFormat)) {
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
    try {
      if (isTauri()) {
        const inspected = await invoke<MediaFile[]>("inspect_files", { paths });
        addFiles(inspected);
        return inspected;
      }
    } catch (err) {
      setError(String(err));
    }

    // Fallback file inspection for browser / dev mode
    const fallbackInspected: MediaFile[] = paths.map((path) => {
      const ext = path.split(".").pop()?.toLowerCase() || "";
      const meta = getFormatMeta(ext);
      return {
        path,
        detectedFormat: ext || "txt",
        category: meta.category,
      };
    });
    addFiles(fallbackInspected);
    return fallbackInspected;
  }

  async function handleSelectFiles() {
    try {
      if (isTauri()) {
        const selected = await open({ multiple: true });
        if (!selected) return;
        await inspectAndAdd(Array.isArray(selected) ? selected : [selected]);
        return;
      }
    } catch {
      // Fallback to browser file input
    }
    fileInputRef.current?.click();
  }

  function handleFileInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = event.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;
    const paths = Array.from(selectedFiles).map((f) => f.name);
    void inspectAndAdd(paths);
    event.target.value = "";
  }

  // HTML5 Drag and Drop handlers
  function handleHtmlDrop(event: React.DragEvent) {
    event.preventDefault();
    setIsDraggingOver(false);
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const droppedPaths = Array.from(event.dataTransfer.files).map(
        (f) => (f as { path?: string }).path || f.name,
      );
      void inspectAndAdd(droppedPaths);
    }
  }

  async function handleOpenWebsite() {
    if ("AndroidBridge" in window) {
      setError(t("offlineOnly"));
      return;
    }
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
    setConversionState("converting");
    setOverallProgress(15);
    setError(undefined);
    setNotice(t("conversionStarted"));
    let newJobs: ConversionJob[] = [];

    try {
      const request = {
        inputPaths: selectedFiles.map((file) => file.path),
        targetFormat: format,
        presetId: null,
        outputDirectory: settings.outputFolder,
        overwritePolicy: settings.overwriteExisting ? "overwrite" : "rename",
        options: {},
      };

      if (isTauri()) {
        newJobs = await invoke<ConversionJob[]>("queue_conversion", { request });
        addJobs(newJobs);
        newJobs.forEach((job) =>
          updateJob({ ...job, status: "processing", progress: 30, currentStep: t("converting") }),
        );

        setOverallProgress(50);
        const results = await invoke<ConversionResult[]>("convert_files", { request });
        setOverallProgress(90);

        const updatedJobsList: ConversionJob[] = [];
        const recentItems: RecentConversionItem[] = [];

        results.forEach((result) => {
          const job = newJobs.find((candidate) => candidate.inputPath === result.inputPath);
          if (!job) return;
          const updated: ConversionJob = {
            ...job,
            outputPath: result.outputPath,
            status: result.success ? "completed" : "failed",
            progress: result.success ? 100 : 0,
            currentStep: result.success ? t("completed") : result.error,
          };
          updateJob(updated);
          updatedJobsList.push(updated);

          if (result.success) {
            const fileObj = selectedFiles.find((f) => f.path === result.inputPath);
            recentItems.push({
              id: job.id,
              name: getBasename(result.inputPath),
              inputPath: result.inputPath,
              outputPath: result.outputPath,
              targetFormat: format,
              category: fileObj?.category || "document",
              timestamp: Date.now(),
              success: true,
            });
          }
        });

        if (recentItems.length > 0) {
          addRecentFiles(recentItems);
        }

        const succeeded = results.filter((result) => result.success).length;
        const failed = results.length - succeeded;
        setNotice(t("conversionSummary", { succeeded, failed }));
        if (failed) {
          setError(results.find((result) => !result.success)?.error ?? t("conversionFailed"));
        }

        setOverallProgress(100);
        setCompletedJobs(updatedJobsList);
        setConversionState("complete");
      } else {
        // Mock simulated conversion for browser testing/development
        await new Promise((r) => setTimeout(r, 600));
        setOverallProgress(65);
        await new Promise((r) => setTimeout(r, 600));
        setOverallProgress(100);
        const mockCompleted: ConversionJob[] = selectedFiles.map((file, idx) => ({
          id: `job-${Date.now()}-${idx}`,
          inputPath: file.path,
          outputPath: `${file.path}.${format}`,
          sourceFormat: file.detectedFormat,
          targetFormat: format,
          status: "completed",
          progress: 100,
          currentStep: t("completed"),
          createdAt: new Date().toISOString(),
        }));
        setCompletedJobs(mockCompleted);
        addRecentFiles(
          mockCompleted.map((j) => ({
            id: j.id,
            name: getBasename(j.inputPath),
            inputPath: j.inputPath,
            outputPath: j.outputPath,
            targetFormat: format,
            category: "document",
            timestamp: Date.now(),
            success: true,
          })),
        );
        setConversionState("complete");
      }
    } catch (reason) {
      newJobs.forEach((job) =>
        updateJob({ ...job, status: "failed", progress: 0, currentStep: String(reason) }),
      );
      setError(String(reason));
      setNotice(undefined);
      setConversionState("idle");
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

  function handleConvertMore() {
    clearFiles();
    setConversionState("idle");
    setOverallProgress(0);
    setNotice(undefined);
    setError(undefined);
  }

  // Active Target Format metadata
  const targetMeta = getFormatMeta(targetFormat);

  // If in converting state, show the Mobile/Desktop Converting Screen!
  if (conversionState === "converting") {
    return (
      <ConvertingScreen
        files={files}
        jobs={jobs}
        targetFormat={targetFormat}
        overallProgress={overallProgress}
        onCancel={() => setConversionState("idle")}
      />
    );
  }

  // If in conversion complete state, show Celebration Complete Screen!
  if (conversionState === "complete") {
    return (
      <CompleteScreen
        completedJobs={completedJobs}
        targetFormat={targetFormat}
        onConvertMore={handleConvertMore}
      />
    );
  }

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-6" id="convert">
      {/* Hidden file input for fallback */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Welcome Heading (Desktop View) */}
      <div className="hidden lg:block space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">{t("welcomeBack")}</h2>
        <p className="text-sm text-slate-400">{t("welcomeSubtitle")}</p>
      </div>

      {/* Large Drop Zone Card */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingOver(true);
        }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={handleHtmlDrop}
        className={`relative flex min-h-[220px] sm:min-h-[260px] flex-col items-center justify-center rounded-3xl border-2 border-dashed p-6 sm:p-10 text-center transition ${
          isDraggingOver
            ? "border-emerald-500 bg-emerald-50/50 scale-[1.005]"
            : "border-slate-200 bg-white hover:border-slate-300"
        }`}
      >
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl text-slate-700">
          <UploadCloud className="h-12 w-12 stroke-[1.6]" />
        </div>

        <p className="text-base sm:text-lg font-bold text-slate-900">{t("dropFilesHere")}</p>
        <p className="mt-0.5 text-xs text-slate-400">{t("orClickToSelect")}</p>

        <button
          type="button"
          disabled={isConverting}
          onClick={() => void handleSelectFiles()}
          className="mt-4 flex items-center gap-2 rounded-full bg-emerald-700 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-700/20 hover:bg-emerald-800 transition active:scale-95 disabled:opacity-50"
        >
          <FolderOpen className="h-4 w-4" />
          <span>{t("selectFiles")}</span>
        </button>

        <p className="mt-4 text-[11px] text-slate-400">{t("mediaTypesHint")}</p>
      </div>

      {/* Target Format and Selected Files Cards Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Target Format Card */}
        <div className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-5 shadow-sm transition">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t("targetFormat")}
          </span>

          <button
            type="button"
            disabled={isConverting}
            onClick={() => setIsFormatModalOpen(true)}
            className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/60 p-3 hover:border-slate-300 hover:bg-slate-100/60 transition disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <FormatIcon format={targetFormat} category={targetMeta.category} size="md" />
              <div className="text-left">
                <span className="text-sm font-bold text-slate-800">{targetMeta.displayName}</span>
                <span className="block text-[11px] text-slate-400">{targetMeta.subtitle}</span>
              </div>
            </div>

            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>
        </div>

        {/* Selected Files Card */}
        <div className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-5 shadow-sm transition">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {t("selectedFiles")} ({files.length})
            </span>
            {files.length > 0 && (
              <button
                type="button"
                disabled={isConverting}
                onClick={clearFiles}
                className="text-xs font-semibold text-red-500 hover:text-red-700 transition"
              >
                {t("clearAll")}
              </button>
            )}
          </div>

          {files.length === 0 ? (
            <div
              onClick={() => void handleSelectFiles()}
              className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-3 text-slate-400 hover:border-slate-300 hover:bg-slate-100/60 transition"
            >
              <FileText className="h-5 w-5 text-slate-400" />
              <span className="text-xs">{t("noFiles")}</span>
            </div>
          ) : (
            <div
              onClick={() => setIsFilesModalOpen(true)}
              className="flex cursor-pointer items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/60 p-3 hover:border-slate-300 hover:bg-slate-100/60 transition"
            >
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <FormatIcon
                  format={files[0].detectedFormat}
                  category={files[0].category as MediaCategory}
                  size="sm"
                />
                <span className="truncate text-xs font-semibold text-slate-800" title={files[0].path}>
                  {getBasename(files[0].path)}
                </span>
                {files.length > 1 && (
                  <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    +{files.length - 1}
                  </span>
                )}
              </div>

              <span className="text-xs font-medium text-emerald-700 hover:underline">
                {t("files")} &gt;
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Convert Now Action Button */}
      <div>
        <button
          type="button"
          disabled={!files.length || isConverting || !availableFormats.length}
          onClick={() => void runConversion(files, targetFormat)}
          className={`flex w-full items-center justify-center gap-2 rounded-full py-4 text-sm font-bold shadow-md transition active:scale-[0.99] disabled:cursor-not-allowed ${
            !files.length || isConverting || !availableFormats.length
              ? "bg-slate-200 text-slate-400 shadow-none"
              : "bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/20"
          }`}
        >
          <RefreshCw className={`h-4 w-4 ${isConverting ? "animate-spin" : ""}`} />
          <span>{isConverting ? t("converting") : t("convertNow")}</span>
        </button>
      </div>

      {/* Quick Formats Bar (matches Desktop Mockup bottom area) */}
      <QuickFormatsBar
        currentTarget={targetFormat}
        onSelectFormat={(fmt) => setTargetFormat(fmt)}
        disabled={isConverting}
      />

      {/* Incompatibility / Notices */}
      {incompatibilityNotice && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
          <p className="font-medium leading-relaxed">{incompatibilityNotice}</p>
        </div>
      )}

      {/* LibreOffice Engine Helper (Desktop Windows) */}
      {hasDocumentFiles && engineStatus && !engineStatus.libreoffice && (
        <div className="rounded-3xl border border-sky-200 bg-sky-50/70 p-5 text-sm text-sky-950">
          {!isInstallingLo ? (
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-bold">{t("libreOfficeRequiredTitle")}</p>
                <p className="mt-0.5 text-xs text-sky-800">{t("libreOfficeRequiredDesc")}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleInstallLibreOffice()}
                  className="rounded-full bg-sky-600 px-4 py-2 text-xs font-bold text-white hover:bg-sky-700 transition"
                >
                  {t("installLibreOffice")}
                </button>
                <button
                  type="button"
                  onClick={() => void handleOpenWebsite()}
                  className="rounded-full border border-sky-300 bg-white px-4 py-2 text-xs font-bold text-sky-800 hover:bg-sky-100 transition"
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
                  <p className="font-bold text-sky-950">
                    {installProgress?.phase === "installing"
                      ? t("installingLibreOffice")
                      : t("downloadingLibreOffice")}
                  </p>
                </div>
                {installProgress?.percentage !== undefined && (
                  <span className="text-xs font-bold text-sky-800">
                    %{installProgress.percentage}
                  </span>
                )}
              </div>

              <div className="h-2 w-full overflow-hidden rounded-full bg-sky-200">
                <div
                  className="h-full bg-sky-600 transition-all duration-300"
                  style={{ width: `${installProgress?.percentage || 30}%` }}
                />
              </div>

              {installProgress?.line && (
                <p className="truncate rounded-xl border border-sky-200 bg-white/80 px-3 py-1.5 font-mono text-xs text-sky-900">
                  &gt; {installProgress.line}
                </p>
              )}

              {installLogs.length > 0 && (
                <div>
                  <button
                    className="text-xs font-semibold text-sky-700 hover:text-sky-900 underline"
                    onClick={() => setShowLogs(!showLogs)}
                    type="button"
                  >
                    {showLogs ? t("hideLogs") : t("showLogs")} ({installLogs.length})
                  </button>
                  {showLogs && (
                    <div className="mt-2 max-h-36 overflow-y-auto rounded-xl bg-slate-900 p-2.5 font-mono text-[11px] leading-tight text-slate-200 space-y-1">
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

      {notice && (
        <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800">
          {notice}
        </p>
      )}
      {error && (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-xs font-medium text-red-700">{error}</p>
      )}

      {/* Modals */}
      <TargetFormatModal
        isOpen={isFormatModalOpen}
        onClose={() => setIsFormatModalOpen(false)}
        selectedFormat={targetFormat}
        onSelectFormat={(fmt) => setTargetFormat(fmt)}
        allowedFormats={availableFormats}
      />

      <SelectFilesModal
        isOpen={isFilesModalOpen}
        onClose={() => setIsFilesModalOpen(false)}
        files={files}
        onRemoveFile={removeFile}
        onAddMoreFiles={() => void handleSelectFiles()}
        disabled={isConverting}
      />
    </section>
  );
}
