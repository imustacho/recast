export type MediaCategory = "image" | "video" | "audio";

export interface FormatDefinition {
  id: string;
  displayName: string;
  category: MediaCategory;
  extensions: string[];
  mimeTypes: string[];
  defaultExtension: string;
  ffmpegFormat?: string;
  defaultVideoCodec?: string;
  defaultAudioCodec?: string;
}

export interface CodecDefinition {
  id: string;
  kind: "video" | "audio";
  ffmpegEncoder: string;
  defaultArgs: string[];
}

export interface ConversionCapabilities {
  formats: FormatDefinition[];
  codecs: CodecDefinition[];
  targetsBySourceCategory: Record<MediaCategory, string[]>;
}

export interface ConversionJob {
  id: string;
  inputPath: string;
  outputPath?: string;
  sourceFormat?: string;
  targetFormat: string;
  presetId?: string;
  status: "pending" | "inspecting" | "ready" | "processing" | "completed" | "failed" | "cancelled";
  progress: number;
  currentStep?: string;
  createdAt: string;
}

export interface ConversionResult {
  inputPath: string;
  outputPath?: string;
  success: boolean;
  error?: string;
}

export interface LaunchRequest {
  paths: string[];
  targetFormat?: string;
  autoStart: boolean;
}

export interface MediaFile {
  path: string;
  detectedFormat: string;
  category: MediaCategory;
}
