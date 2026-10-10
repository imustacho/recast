import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Check, Plus, Trash2, X } from "lucide-react";
import { FormatIcon } from "./FormatIcon";
import { getBasename } from "../lib/formatUtils";
import type { MediaCategory, MediaFile } from "../lib/types";

interface SelectFilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: MediaFile[];
  onRemoveFile: (path: string) => void;
  onAddMoreFiles: () => void;
  disabled?: boolean;
}

export function SelectFilesModal({
  isOpen,
  onClose,
  files,
  onRemoveFile,
  onAddMoreFiles,
  disabled = false,
}: SelectFilesModalProps) {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(
    () => new Set(files.map((f) => f.path)),
  );

  const categories = [
    { id: "all", label: t("all") },
    { id: "image", label: t("images") },
    { id: "video", label: t("videos") },
    { id: "audio", label: t("audios") },
    { id: "document", label: t("documents") },
  ];

  const filteredFiles = useMemo(() => {
    if (activeCategory === "all") return files;
    return files.filter((f) => f.category === activeCategory);
  }, [files, activeCategory]);

  if (!isOpen) return null;

  function toggleFile(path: string) {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }

  function handleAdd() {
    // Files that are unchecked get removed
    files.forEach((f) => {
      if (!selectedPaths.has(f.path)) {
        onRemoveFile(f.path);
      }
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-3 sm:p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 transition"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h2 className="text-base font-bold text-slate-900">{t("selectedFiles")}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 transition"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Categories */}
        <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto px-5 py-3">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                activeCategory === cat.id
                  ? "bg-emerald-700 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* File List */}
        <div className="flex-1 overflow-y-auto px-5 py-2 space-y-2">
          {filteredFiles.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">
              {t("noFiles")}
            </div>
          ) : (
            filteredFiles.map((file) => {
              const isChecked = selectedPaths.has(file.path);
              const basename = getBasename(file.path);

              return (
                <div
                  key={file.path}
                  className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-3 hover:border-slate-200 hover:bg-slate-50/50 transition"
                >
                  <div
                    className="flex flex-1 min-w-0 items-center gap-3 cursor-pointer mr-2"
                    onClick={() => toggleFile(file.path)}
                  >
                    <FormatIcon
                      format={file.detectedFormat}
                      category={file.category as MediaCategory}
                      size="md"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800" title={basename}>
                        {basename}
                      </p>
                      <p className="text-xs uppercase text-slate-400 font-mono">
                        {file.detectedFormat}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onRemoveFile(file.path)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                      title={t("removeFile")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleFile(file.path)}
                      className={`flex h-6 w-6 items-center justify-center rounded-lg transition ${
                        isChecked
                          ? "bg-emerald-600 text-white"
                          : "border border-slate-300 bg-white"
                      }`}
                    >
                      {isChecked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center gap-3 border-t border-slate-100 bg-slate-50/50 px-5 py-4">
          <button
            type="button"
            onClick={onAddMoreFiles}
            className="flex items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
          >
            <Plus className="h-4 w-4" />
            <span>{t("selectFiles")}</span>
          </button>

          <button
            type="button"
            onClick={handleAdd}
            className="flex-1 rounded-full bg-emerald-700 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-700/20 hover:bg-emerald-800 transition"
          >
            {t("confirm")} ({selectedPaths.size})
          </button>
        </div>
      </div>
    </div>
  );
}
