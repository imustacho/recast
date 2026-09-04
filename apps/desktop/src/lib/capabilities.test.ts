import { describe, expect, it } from "vitest";
import { availableTargetFormats } from "./capabilities";
import type { ConversionCapabilities, MediaFile } from "./types";

const capabilities = {
  formats: ["png", "mp4", "mp3", "docx", "pdf", "xlsx"].map((id) => ({
    id,
    displayName: id.toUpperCase(),
    category:
      id === "png"
        ? "image"
        : id === "mp4"
          ? "video"
          : id === "mp3"
            ? "audio"
            : "document",
    extensions: [id],
    mimeTypes: [],
    defaultExtension: id,
  })),
  codecs: [],
  targetsBySourceCategory: {
    image: ["png"],
    audio: ["mp3"],
    video: ["mp4", "mp3"],
    document: ["pdf", "docx", "xlsx"],
  },
  targetsBySourceFormat: {
    pdf: [],
    docx: ["pdf", "odt", "txt"],
    xlsx: ["pdf", "ods", "csv"],
  },
} satisfies ConversionCapabilities;

const file = (
  category: MediaFile["category"],
  detectedFormat: string = category,
): MediaFile => ({
  path: `${detectedFormat}.fixture`,
  detectedFormat,
  category,
});

describe("availableTargetFormats", () => {
  it("uses backend capabilities for a single source category", () => {
    expect(availableTargetFormats(capabilities, [file("video")])).toEqual(["mp4", "mp3"]);
  });

  it("intersects capabilities for mixed selections", () => {
    expect(availableTargetFormats(capabilities, [file("video"), file("audio")])).toEqual(["mp3"]);
  });

  it("uses targetsBySourceFormat when available for specific document formats", () => {
    expect(availableTargetFormats(capabilities, [file("document", "docx")])).toEqual([
      "pdf",
      "odt",
      "txt",
    ]);
  });

  it("enforces pdf as output-only with no target formats", () => {
    expect(availableTargetFormats(capabilities, [file("document", "pdf")])).toEqual([]);
  });

  it("intersects across document families leaving only common formats like pdf", () => {
    expect(
      availableTargetFormats(capabilities, [
        file("document", "docx"),
        file("document", "xlsx"),
      ]),
    ).toEqual(["pdf"]);
  });
});
