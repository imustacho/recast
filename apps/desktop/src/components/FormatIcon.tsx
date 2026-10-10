import {
  FileText,
  Film,
  Headphones,
  Image as ImageIcon,
  Music,
  Video,
} from "lucide-react";
import { getFormatMeta } from "../lib/formatMeta";
import type { MediaCategory } from "../lib/types";

interface FormatIconProps {
  format?: string;
  category?: MediaCategory;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export function FormatIcon({
  format = "file",
  category,
  className = "",
  size = "md",
}: FormatIconProps) {
  const meta = getFormatMeta(format);
  const effectiveCategory = category || meta.category;

  const sizeClasses = {
    sm: "h-7 w-7 rounded-lg text-xs",
    md: "h-9 w-9 rounded-xl text-sm",
    lg: "h-11 w-11 rounded-2xl text-base",
    xl: "h-14 w-14 rounded-2xl text-lg",
  }[size];

  const iconSizes = {
    sm: "h-3.5 w-3.5",
    md: "h-4.5 w-4.5",
    lg: "h-5.5 w-5.5",
    xl: "h-7 w-7",
  }[size];

  function renderGlyph() {
    switch (effectiveCategory) {
      case "image":
        return <ImageIcon className={iconSizes} />;
      case "video":
        return format.toLowerCase() === "mp4" ? (
          <Video className={iconSizes} />
        ) : (
          <Film className={iconSizes} />
        );
      case "audio":
        return format.toLowerCase() === "mp3" ? (
          <Music className={iconSizes} />
        ) : (
          <Headphones className={iconSizes} />
        );
      case "document":
      default:
        return <FileText className={iconSizes} />;
    }
  }

  return (
    <div
      className={`inline-flex shrink-0 items-center justify-center font-semibold transition ${meta.iconBg} ${meta.iconText} ${sizeClasses} ${className}`}
      title={meta.displayName}
    >
      {renderGlyph()}
    </div>
  );
}
