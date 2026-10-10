import "@testing-library/jest-dom";
import { act, render, screen } from "@testing-library/react";
import { App } from "./App";
import { useAppStore } from "./lib/store";
import "./lib/i18n";

describe("App", () => {
  it("renders the converter shell", () => {
    render(<App />);
    expect(screen.getByText("Recast")).toBeInTheDocument();
    expect(screen.getByText("Select files")).toBeInTheDocument();
    expect(screen.getByText("Convert now")).toBeInTheDocument();
    expect(screen.queryByText("Install right-click menu")).not.toBeInTheDocument();
  });

  it("applies dark mode class to document element when theme changes", () => {
    render(<App />);

    act(() => {
      useAppStore.getState().updateSettings({ theme: "dark" });
    });
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    act(() => {
      useAppStore.getState().updateSettings({ theme: "light" });
    });
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
