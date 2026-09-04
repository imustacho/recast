import type { ConversionCapabilities, MediaFile } from "./types";

export function availableTargetFormats(
  capabilities: ConversionCapabilities | undefined,
  files: MediaFile[],
): string[] {
  if (!capabilities) return [];
  if (!files.length) return capabilities.formats.map((format) => format.id);

  const getTargets = (file: MediaFile): string[] => {
    if (capabilities.targetsBySourceFormat && file.detectedFormat in capabilities.targetsBySourceFormat) {
      return capabilities.targetsBySourceFormat[file.detectedFormat] ?? [];
    }
    return capabilities.targetsBySourceCategory[file.category] ?? [];
  };

  const firstTargets = getTargets(files[0]);
  return firstTargets.filter((target) =>
    files.every((file) => getTargets(file).includes(target)),
  );
}
