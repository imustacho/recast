export function formatTimeAgo(timestamp: number, lang: string = "en"): string {
  const code = lang.slice(0, 2).toLowerCase();
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));

  if (diffSec < 60) {
    switch (code) {
      case "tr": return "Az önce";
      case "de": return "Gerade eben";
      case "es": return "Hace un momento";
      case "fr": return "À l'instant";
      case "it": return "Proprio ora";
      case "ru": return "Только что";
      default: return "Just now";
    }
  }

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    switch (code) {
      case "tr": return `${diffMin}dk önce`;
      case "ru": return `${diffMin}м назад`;
      default: return `${diffMin}m ago`;
    }
  }

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    switch (code) {
      case "tr": return `${diffHours}sa önce`;
      case "ru": return `${diffHours}ч назад`;
      default: return `${diffHours}h ago`;
    }
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) {
    switch (code) {
      case "tr": return "Dün";
      case "de": return "Gestern";
      case "es": return "Ayer";
      case "fr": return "Hier";
      case "it": return "Ieri";
      case "ru": return "Вчера";
      default: return "Yesterday";
    }
  }

  if (diffDays < 7) {
    switch (code) {
      case "tr": return `${diffDays} gün önce`;
      case "ru": return `${diffDays}д назад`;
      default: return `${diffDays}d ago`;
    }
  }

  const date = new Date(timestamp);
  const localeMap: Record<string, string> = {
    tr: "tr-TR",
    de: "de-DE",
    es: "es-ES",
    fr: "fr-FR",
    it: "it-IT",
    ru: "ru-RU",
    en: "en-US",
  };
  return date.toLocaleDateString(localeMap[code] || "en-US", {
    month: "short",
    day: "numeric",
  });
}

export function formatFileSize(bytes?: number): string {
  if (bytes === undefined || bytes === null || isNaN(bytes)) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getBasename(path: string): string {
  return path.split(/[\\/]/).pop() || path;
}
