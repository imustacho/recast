import { invoke, isTauri } from "@tauri-apps/api/core";
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
  LaunchRequest,
  MediaFile,
} from "../../lib/types";

export function ConvertView() {
  const { t } = useTranslation();
  const launchHandled = useRef(false);
  const [isConverting, setIsConverting] = useState(false);
  const [notice, setNotice] = useState<string>();
  const [error, setError] = useState<string>();
  const [capabilities, setCapabilities] = useState<ConversionCapabilities>();
  const { files, targetFormat, addFiles, setTargetFormat, addJobs, updateJob } =
    useAppStore();

  const availableFormats = useMemo(
    () => availableTargetFormats(capabilities, files),
    [capabilities, files],
  );
  const formatNames = useMemo(
    () => new Map(capabilities?.formats.map((format) => [format.id, format.displayName]) ?? []),
    [capabilities],
  );

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
            value={availableFormats.includes(targetFormat) ? targetFormat : availableFormats[0]}
          >
            {availableFormats.map((format) => (
              <option key={format} value={format}>
                {formatNames.get(format) ?? format.toUpperCase()}
              </option>
            ))}
          </select>
        </label>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <span className="mb-2 block text-sm text-slate-500">{t("files")}</span>
          <p className="text-2xl font-semibold text-ink">{files.length}</p>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
          {t("detectedFiles")}
        </h2>
        <div className="space-y-2">
          {files.map((file) => (
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2" key={file.path}>
              <span className="truncate text-sm text-slate-700">{file.path}</span>
              <span className="rounded-full bg-accentSoft px-2 py-1 text-xs text-accent">{file.detectedFormat}</span>
            </div>
          ))}
          {!files.length && <p className="text-sm text-slate-400">{t("noFiles")}</p>}
        </div>
      </div>

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
