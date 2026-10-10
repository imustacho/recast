import type { ConversionCapabilities, MediaFile } from "./types";

export function availableTargetFormats(
  capabilities: ConversionCapabilities | undefined,
  files: MediaFile[],
): string[] {
  if (!capabilities) return [];
  if (!files.length) return capabilities.formats.map((format) => format.id);

  const normalize = (value: string) => value.trim().replace(/^\./, "").toLowerCase();
  const formatsByExtension = new Map<string, string>();
  capabilities.formats.forEach((format) => {
    formatsByExtension.set(normalize(format.id), format.id);
    format.extensions.forEach((extension) => formatsByExtension.set(normalize(extension), format.id));
  });

  const getTargets = (file: MediaFile): string[] => {
    const detected = normalize(file.detectedFormat);
    const sourceId = formatsByExtension.get(detected) ?? detected;
    const sourceTargets = capabilities.targetsBySourceFormat?.[sourceId];
    if (sourceTargets) {
      return sourceTargets;
    }
    return capabilities.targetsBySourceCategory[file.category] ?? [];
  };

  const firstTargets = getTargets(files[0]);
  return firstTargets.filter((target) =>
    files.every((file) => getTargets(file).includes(target)),
  );
}
