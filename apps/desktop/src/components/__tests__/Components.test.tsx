import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import { QuickFormatsBar } from "../QuickFormatsBar";
import { TargetFormatModal } from "../TargetFormatModal";
import { ConvertingScreen } from "../ConvertingScreen";
import { CompleteScreen } from "../CompleteScreen";
import { HistoryScreen } from "../HistoryScreen";
import { SettingsScreen } from "../SettingsScreen";
import { FormatIcon } from "../FormatIcon";
import { formatTimeAgo, formatFileSize, getBasename } from "../../lib/formatUtils";
import { useAppStore } from "../../lib/store";
import "../../lib/i18n";

vi.mock("@tauri-apps/plugin-opener", () => ({ revealItemInDir: vi.fn() }));

describe("Format Utilities", () => {
  it("formats relative time correctly", () => {
    const now = Date.now();
    expect(formatTimeAgo(now - 10000, "en")).toBe("Just now");
    expect(formatTimeAgo(now - 10000, "tr")).toBe("Az önce");
    expect(formatTimeAgo(now - 10000, "de")).toBe("Gerade eben");
    expect(formatTimeAgo(now - 10000, "es")).toBe("Hace un momento");
    expect(formatTimeAgo(now - 10000, "fr")).toBe("À l'instant");
    expect(formatTimeAgo(now - 10000, "it")).toBe("Proprio ora");
    expect(formatTimeAgo(now - 10000, "ru")).toBe("Только что");
    expect(formatTimeAgo(now - 10000, "zh")).toBe("刚刚");
    expect(formatTimeAgo(now - 10000, "ja")).toBe("たった今");
    expect(formatTimeAgo(now - 10000, "ko")).toBe("방금 전");

    expect(formatTimeAgo(now - 120000, "en")).toBe("2m ago");
    expect(formatTimeAgo(now - 120000, "tr")).toBe("2dk önce");
    expect(formatTimeAgo(now - 7200000, "en")).toBe("2h ago");
    expect(formatTimeAgo(now - 7200000, "tr")).toBe("2sa önce");
  });

  it("formats file sizes correctly", () => {
    expect(formatFileSize(500)).toBe("500 B");
    expect(formatFileSize(2048)).toBe("2.0 KB");
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0 MB");
  });

  it("extracts path basename correctly", () => {
    expect(getBasename("C:\\Users\\dev\\image.png")).toBe("image.png");
    expect(getBasename("/home/user/document.pdf")).toBe("document.pdf");
  });
});

describe("FormatIcon", () => {
  it("renders with appropriate category styling", () => {
    const { container } = render(<FormatIcon format="jpg" category="image" size="md" />);
    expect(container.firstChild).toBeInTheDocument();
  });
});

describe("QuickFormatsBar", () => {
  it("renders all popular formats and triggers selection", () => {
    const onSelect = vi.fn();
    render(<QuickFormatsBar currentTarget="jpg" onSelectFormat={onSelect} />);

    expect(screen.getByText("JPG")).toBeInTheDocument();
    expect(screen.getByText("PNG")).toBeInTheDocument();
    expect(screen.getByText("MP4")).toBeInTheDocument();
    expect(screen.getByText("PDF")).toBeInTheDocument();

    fireEvent.click(screen.getByText("PNG"));
    expect(onSelect).toHaveBeenCalledWith("png");
  });
});

describe("TargetFormatModal", () => {
  it("filters formats via search query", () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    render(
      <TargetFormatModal
        isOpen={true}
        onClose={onClose}
        selectedFormat="jpg"
        onSelectFormat={onSelect}
      />,
    );

    const searchInput = screen.getByPlaceholderText(/format/i);
    fireEvent.change(searchInput, { target: { value: "mp4" } });

    expect(screen.getByText("MP4")).toBeInTheDocument();
    expect(screen.queryByText("JPG / JPEG")).not.toBeInTheDocument();
  });
});

describe("ConvertingScreen", () => {
  it("renders circular progress percentage and file status", () => {
    const files = [
      { path: "C:/test/file1.png", detectedFormat: "png", category: "image" as const },
    ];
    const jobs = [
      {
        id: "job-1",
        inputPath: "C:/test/file1.png",
        targetFormat: "jpg",
        status: "processing" as const,
        progress: 68,
        createdAt: "2026-10-10",
      },
    ];

    render(
      <ConvertingScreen
        files={files}
        jobs={jobs}
        targetFormat="jpg"
        overallProgress={68}
      />,
    );

    expect(screen.getAllByText("68%")[0]).toBeInTheDocument();
    expect(screen.getByText("file1.png")).toBeInTheDocument();
  });
});

describe("CompleteScreen", () => {
  it("renders completed conversion summary and convert more button", () => {
    const completedJobs = [
      {
        id: "job-1",
        inputPath: "C:/test/file1.png",
        outputPath: "C:/test/file1.jpg",
        targetFormat: "jpg",
        status: "completed" as const,
        progress: 100,
        createdAt: "2026-10-10",
      },
    ];
    const onConvertMore = vi.fn();

    render(
      <CompleteScreen
        completedJobs={completedJobs}
        targetFormat="jpg"
        onConvertMore={onConvertMore}
      />,
    );

    expect(screen.getByText(/conversion complete/i)).toBeInTheDocument();
    expect(screen.getByText("file1.png")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /convert more/i }));
    expect(onConvertMore).toHaveBeenCalled();
  });
});

describe("HistoryScreen", () => {
  it("renders converted files and allows clearing list", () => {
    const items = [
      {
        id: "item-1",
        name: "test.pdf",
        inputPath: "C:/test/test.docx",
        outputPath: "C:/test/test.pdf",
        targetFormat: "pdf",
        category: "document" as const,
        timestamp: Date.now(),
        success: true,
      },
    ];
    const onClear = vi.fn();

    render(<HistoryScreen items={items} onClearList={onClear} />);

    expect(screen.getByText("test.pdf")).toBeInTheDocument();

    const clearBtn = screen.getByRole("button", { name: /clear list/i });
    fireEvent.click(clearBtn);
    expect(onClear).toHaveBeenCalled();
  });
});

describe("SettingsScreen", () => {
  it("toggles options in store", () => {
    render(<SettingsScreen />);

    expect(screen.getByText(/keep original files/i)).toBeInTheDocument();
    expect(screen.getByText(/overwrite existing files/i)).toBeInTheDocument();

    const initialState = useAppStore.getState().settings.keepOriginals;
    const toggleButtons = screen.getAllByRole("button");
    // Find the toggle button
    fireEvent.click(toggleButtons[0]);
    expect(useAppStore.getState().settings.keepOriginals).toBe(!initialState);
  });

  it("allows selecting different languages", () => {
    render(<SettingsScreen />);
    fireEvent.click(screen.getByText(/language/i));

    expect(screen.getByText("Deutsch")).toBeInTheDocument();
    expect(screen.getByText("Español")).toBeInTheDocument();
    expect(screen.getByText("Français")).toBeInTheDocument();
    expect(screen.getByText("Italiano")).toBeInTheDocument();
    expect(screen.getByText("Русский")).toBeInTheDocument();
    expect(screen.getByText("中文")).toBeInTheDocument();
    expect(screen.getByText("日本語")).toBeInTheDocument();
    expect(screen.getByText("한국어")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Deutsch"));
    expect(useAppStore.getState().settings.language).toBe("de");
  });
});
