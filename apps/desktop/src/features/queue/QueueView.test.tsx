import "@testing-library/jest-dom";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { QueueView } from "./QueueView";
import { useAppStore } from "../../lib/store";
import "../../lib/i18n";

vi.mock("@tauri-apps/plugin-opener", () => ({ revealItemInDir: vi.fn() }));

it("keeps active conversions in the queue when clearing is unavailable", () => {
  useAppStore.setState({ jobs: [{
    id: "active", inputPath: "photo.png", targetFormat: "jpg",
    status: "processing", progress: 30, createdAt: "2026-10-11",
  }] });
  try {
    render(<QueueView />);
    const clearButton = screen.getByRole("button", { name: "Clear all" });
    expect(clearButton).toBeDisabled();
    fireEvent.click(clearButton);
    expect(useAppStore.getState().jobs).toHaveLength(1);
  } finally { cleanup(); useAppStore.setState({ jobs: [] }); }
});

it("shows a filename and reports an output-opening failure", async () => {
  useAppStore.setState({ jobs: [{
    id: "test", inputPath: "/data/user/0/io.github.imustacho.recast/cache/photo.png",
    outputPath: "/storage/emulated/0/Android/data/io.github.imustacho.recast/files/photo.gif",
    targetFormat: "gif", status: "completed", progress: 100, createdAt: "2026-09-06",
  }] });
  vi.mocked(revealItemInDir).mockRejectedValueOnce(new Error("No viewer installed"));
  try {
    render(<QueueView />);
    expect(screen.getByText("photo.png")).toBeInTheDocument();
    expect(screen.queryByText(/io\.github/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show output" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No viewer installed");
  } finally { cleanup(); useAppStore.setState({ jobs: [] }); }
});
