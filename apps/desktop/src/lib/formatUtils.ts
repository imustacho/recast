export function formatTimeAgo(timestamp: number, lang: string = "en"): string {
  const isTr = lang.startsWith("tr");
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));

  if (diffSec < 60) {
    return isTr ? "Az önce" : "Just now";
  }
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return isTr ? `${diffMin}dk önce` : `${diffMin}m ago`;
  }
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    return isTr ? `${diffHours}sa önce` : `${diffHours}h ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) {
    return isTr ? "Dün" : "Yesterday";
  }
  if (diffDays < 7) {
    return isTr ? `${diffDays} gün önce` : `${diffDays}d ago`;
  }

  const date = new Date(timestamp);
  return date.toLocaleDateString(isTr ? "tr-TR" : "en-US", {
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
