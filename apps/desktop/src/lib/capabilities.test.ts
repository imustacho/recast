import { describe, expect, it } from "vitest";
import { availableTargetFormats } from "./capabilities";
import type { ConversionCapabilities, MediaFile } from "./types";

const capabilities = {
  formats: ["png", "mp4", "mp3"].map((id) => ({
    id,
    displayName: id.toUpperCase(),
    category: id === "png" ? "image" : id === "mp4" ? "video" : "audio",
    extensions: [id],
    mimeTypes: [],
    defaultExtension: id,
  })),
  codecs: [],
  targetsBySourceCategory: {
    image: ["png"],
    audio: ["mp3"],
    video: ["mp4", "mp3"],
  },
} satisfies ConversionCapabilities;

const file = (category: MediaFile["category"]): MediaFile => ({
  path: `${category}.fixture`,
  detectedFormat: category,
  category,
});

describe("availableTargetFormats", () => {
  it("uses backend capabilities for a single source category", () => {
    expect(availableTargetFormats(capabilities, [file("video")])).toEqual(["mp4", "mp3"]);
  });

  it("intersects capabilities for mixed selections", () => {
    expect(availableTargetFormats(capabilities, [file("video"), file("audio")])).toEqual(["mp3"]);
  });
});
