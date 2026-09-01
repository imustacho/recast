import type { ConversionCapabilities, MediaFile } from "./types";

export function availableTargetFormats(
  capabilities: ConversionCapabilities | undefined,
  files: MediaFile[],
): string[] {
  if (!capabilities) return [];
  if (!files.length) return capabilities.formats.map((format) => format.id);

  return capabilities.targetsBySourceCategory[files[0].category].filter((target) =>
    files.every((file) => capabilities.targetsBySourceCategory[file.category].includes(target)),
  );
}
