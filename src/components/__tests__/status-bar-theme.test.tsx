// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StatusBarBridge } from "../StatusBarBridge";

const mocks = vi.hoisted(() => ({
  setStyle: vi.fn().mockResolvedValue(undefined),
  setBackgroundColor: vi.fn().mockResolvedValue(undefined),
  setOverlaysWebView: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => true } }));
vi.mock("@capacitor/status-bar", () => ({
  StatusBar: mocks,
  Style: { Light: "LIGHT", Dark: "DARK" },
}));

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute("data-mode");
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.style.removeProperty("--surface");
  vi.clearAllMocks();
});

describe("StatusBarBridge", () => {
  it("observe le mode résolu et non l'identifiant d'accent", async () => {
    const root = document.documentElement;
    root.dataset.mode = "dark";
    root.dataset.theme = "trust";
    root.style.setProperty("--surface", "#212121");
    render(<StatusBarBridge />);
    expect(mocks.setStyle).toHaveBeenLastCalledWith({ style: "LIGHT" });
    expect(mocks.setBackgroundColor).toHaveBeenLastCalledWith({ color: "#212121" });
    await act(async () => { root.dataset.mode = "light"; });
    expect(mocks.setStyle).toHaveBeenLastCalledWith({ style: "DARK" });
    await act(async () => { root.dataset.mode = "dark"; });
    expect(mocks.setStyle).toHaveBeenLastCalledWith({ style: "LIGHT" });
  });
});
