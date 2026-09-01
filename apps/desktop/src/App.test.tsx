import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { App } from "./App";
import "./lib/i18n";

describe("App", () => {
  it("renders the converter shell", () => {
    render(<App />);
    expect(screen.getByText("Recast")).toBeInTheDocument();
    expect(screen.getByText("Select files")).toBeInTheDocument();
    expect(screen.getByText("Convert now")).toBeInTheDocument();
    expect(screen.queryByText("Install right-click menu")).not.toBeInTheDocument();
  });
});
