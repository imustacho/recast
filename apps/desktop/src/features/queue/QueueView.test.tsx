import "@testing-library/jest-dom";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { QueueView } from "./QueueView";
import { useAppStore } from "../../lib/store";
import "../../lib/i18n";

vi.mock("@tauri-apps/plugin-opener", () => ({ revealItemInDir: vi.fn() }));

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
    fireEvent.click(screen.getByRole("button"));
    expect(await screen.findByRole("alert")).toHaveTextContent("No viewer installed");
  } finally { cleanup(); useAppStore.setState({ jobs: [] }); }
});
