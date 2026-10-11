import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Check, Search, X } from "lucide-react";
import { FORMAT_META_MAP, getFormatMeta, type FormatMeta } from "../lib/formatMeta";
import { FormatIcon } from "./FormatIcon";
import type { MediaCategory } from "../lib/types";

interface TargetFormatModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFormat: string;
  onSelectFormat: (format: string) => void;
  allowedFormats?: string[];
}

export function TargetFormatModal({
  isOpen,
  onClose,
  selectedFormat,
  onSelectFormat,
  allowedFormats,
}: TargetFormatModalProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [tentativeSelection, setTentativeSelection] = useState(selectedFormat);

  const categories = [
    { id: "all", label: t("all") },
    { id: "image", label: t("images") },
    { id: "video", label: t("videos") },
    { id: "audio", label: t("audios") },
    { id: "document", label: t("documents") },
  ];

  const formatList = useMemo(() => {
    let list: FormatMeta[];

    if (allowedFormats && allowedFormats.length > 0) {
      const uniqueAllowed = Array.from(
        new Set(allowedFormats.map((f) => f.toLowerCase().replace(/^\./, ""))),
      );
      list = uniqueAllowed.map((fmt) => getFormatMeta(fmt));
    } else {
      list = Object.values(FORMAT_META_MAP).filter(
        (item, idx, self) => self.findIndex((i) => i.id === item.id) === idx,
      );
    }

    if (activeCategory !== "all") {
      list = list.filter((item) => item.category === activeCategory);
    }

    if (search.trim()) {
      const query = search.trim().toLowerCase();
      list = list.filter(
        (item) =>
          item.id.toLowerCase().includes(query) ||
          item.displayName.toLowerCase().includes(query) ||
          item.subtitle.toLowerCase().includes(query),
      );
    }

    return list;
  }, [allowedFormats, activeCategory, search]);

  if (!isOpen) return null;

  function handleConfirm() {
    onSelectFormat(tentativeSelection);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 dark:bg-black/70 p-3 sm:p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#1E293B] shadow-2xl transition">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">{t("targetFormat")}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-5 pt-4">
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder={t("searchFormat")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/80 py-2.5 pl-10 pr-4 text-sm text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto px-5 py-3">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                activeCategory === cat.id
                  ? "bg-emerald-700 dark:bg-emerald-600 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Format List */}
        <div className="flex-1 overflow-y-auto px-5 py-2 space-y-2">
          {formatList.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400 dark:text-slate-500">
              {t("noCompatibleFormats")}
            </div>
          ) : (
            formatList.map((item) => {
              const isSelected = tentativeSelection.toLowerCase() === item.id.toLowerCase();
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTentativeSelection(item.id)}
                  className={`flex w-full items-center justify-between rounded-2xl border p-3.5 text-left transition ${
                    isSelected
                      ? "border-emerald-500 dark:border-emerald-500/80 bg-emerald-50/50 dark:bg-emerald-950/60 shadow-sm"
                      : "border-slate-100 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 hover:border-slate-200 dark:hover:border-slate-600 hover:bg-slate-50/70 dark:hover:bg-slate-700/50"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <FormatIcon format={item.id} category={item.category as MediaCategory} size="md" />
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-white">{item.displayName}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-400">{item.subtitle}</p>
                    </div>
                  </div>

                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded-full transition ${
                      isSelected
                        ? "bg-emerald-600 text-white"
                        : "border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Bottom Confirm Bar */}
        <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 px-5 py-4">
          <button
            type="button"
            onClick={handleConfirm}
            className="w-full rounded-full bg-emerald-700 dark:bg-emerald-600 py-3 text-sm font-bold text-white shadow-md shadow-emerald-700/20 hover:bg-emerald-800 dark:hover:bg-emerald-500 transition active:scale-[0.98]"
          >
            {t("confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
