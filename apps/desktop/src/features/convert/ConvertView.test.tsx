import "@testing-library/jest-dom";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ConvertView } from "./ConvertView";
import { useAppStore } from "../../lib/store";
import "../../lib/i18n";

beforeEach(() => useAppStore.setState({ files: [], jobs: [], conversionState: "idle", targetFormat: "jpg" }));
afterEach(() => { cleanup(); useAppStore.setState({ files: [] }); });

describe("file-dependent target formats", () => {
  it("shows a placeholder instead of format selectors before adding a file", () => {
    render(<ConvertView />);
    expect(screen.getByRole("status")).toHaveTextContent("Add a file");
    expect(screen.queryByRole("group", { name: "Target format" })).not.toBeInTheDocument();
    expect(screen.queryByText("Quick formats")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "All formats" })).not.toBeInTheDocument();
  });

  it("updates targets when the source file changes and restores the placeholder after removal", () => {
    render(<ConvertView />);
    act(() => useAppStore.getState().addFiles([{ path: "photo.png", detectedFormat: "png", category: "image" }]));
    const imageTargets = within(screen.getByRole("group", { name: "Target format" }));
    expect(imageTargets.getByRole("button", { name: "jpg" })).toBeInTheDocument();
    expect(imageTargets.queryByRole("button", { name: "mp3" })).not.toBeInTheDocument();
    act(() => useAppStore.setState({ files: [{ path: "song.mp3", detectedFormat: "mp3", category: "audio" }] }));
    const audioTargets = within(screen.getByRole("group", { name: "Target format" }));
    expect(audioTargets.getByRole("button", { name: "wav" })).toBeInTheDocument();
    expect(audioTargets.queryByRole("button", { name: "jpg" })).not.toBeInTheDocument();
    expect(useAppStore.getState().targetFormat).not.toBe("jpg");
    act(() => useAppStore.getState().clearFiles());
    expect(screen.getByRole("status")).toHaveTextContent("Add a file");
  });

  it("does not offer unrelated targets for incompatible file selections", () => {
    useAppStore.setState({ files: [
      { path: "photo.png", detectedFormat: "png", category: "image" },
      { path: "song.mp3", detectedFormat: "mp3", category: "audio" },
    ] });
    render(<ConvertView />);
    expect(screen.queryByRole("group", { name: "Target format" })).not.toBeInTheDocument();
    expect(screen.queryByText("Quick formats")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Convert now" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "All formats" })).toBeDisabled();
  });
});
