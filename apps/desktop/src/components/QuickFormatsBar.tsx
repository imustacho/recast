import { useTranslation } from "react-i18next";
import { QUICK_FORMATS, getFormatMeta } from "../lib/formatMeta";
import { FormatIcon } from "./FormatIcon";

interface QuickFormatsBarProps {
  currentTarget: string;
  onSelectFormat: (format: string) => void;
  disabled?: boolean;
}

export function QuickFormatsBar({
  currentTarget,
  onSelectFormat,
  disabled = false,
}: QuickFormatsBarProps) {
  const { t } = useTranslation();

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition">
      <div className="mb-3">
        <h3 className="text-sm font-bold text-slate-800">{t("quickFormats")}</h3>
        <p className="text-xs text-slate-400">{t("quickFormatsDesc")}</p>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
        {QUICK_FORMATS.map((item) => {
          const isSelected = currentTarget.toLowerCase() === item.id.toLowerCase();
          const meta = getFormatMeta(item.id);

          return (
            <button
              key={item.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelectFormat(item.id)}
              className={`group flex flex-col items-center justify-center gap-1.5 rounded-2xl border p-2.5 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
                isSelected
                  ? "border-emerald-500 bg-emerald-50/70 shadow-sm ring-2 ring-emerald-500/20"
                  : "border-slate-100 bg-slate-50/60 hover:border-slate-200 hover:bg-slate-100/60"
              }`}
            >
              <FormatIcon format={item.id} category={item.category} size="sm" />
              <span
                className={`text-[11px] font-bold uppercase tracking-wider ${
                  isSelected ? "text-emerald-800" : "text-slate-600 group-hover:text-slate-900"
                }`}
              >
                {meta.id.toUpperCase()}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
