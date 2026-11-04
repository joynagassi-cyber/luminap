// @vitest-environment jsdom
/**
 * C-10 (A3) — évitement clavier sans double compensation.
 *
 * La config Capacitor redimensionne la WebView (`Keyboard.resize:
 * 'native'` + `resizeOnFullScreen: true` pour l'edge-to-edge Android
 * 15). Le hook ne doit compenser que la partie réellement occluse de
 * la fenêtre (`innerHeight − visualViewport.height`) : totale quand le
 * clavier survole (comportement historique), nulle quand le natif a
 * déjà redimensionné. Non-vacuité : sans le reliquat, les cas
 * « redimensionné » rendraient 280 au lieu de 0.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  useKeyboardAvoidance,
  computeKeyboardCompensation,
} from "../useKeyboardAvoidance";

type KeyboardInfo = { keyboardHeight: number };
type Listener = (info: KeyboardInfo) => void;

const h = vi.hoisted(() => ({
  native: true,
  listeners: new Map<string, Listener>(),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => h.native },
}));
vi.mock("@capacitor/keyboard", () => ({
  Keyboard: {
    addListener: async (event: string, cb: Listener) => {
      h.listeners.set(event, cb);
      return {
        remove: async () => {
          h.listeners.delete(event);
        },
      };
    },
  },
}));

// Fenêtre de mise en page et viewport visuel contrôlés par le test.
let layoutHeight = 800;
let visualHeight = 800;
let visualResizeListener: (() => void) | null = null;

function fireDidShow(keyboardHeight: number) {
  act(() => {
    h.listeners.get("keyboardDidShow")?.({ keyboardHeight });
  });
}
function fireDidHide() {
  act(() => {
    h.listeners.get("keyboardDidHide")?.({ keyboardHeight: 0 });
  });
}
function fireVisualResize() {
  act(() => {
    visualResizeListener?.();
  });
}

beforeEach(() => {
  h.native = true;
  h.listeners.clear();
  vi.clearAllMocks();
  layoutHeight = 800;
  visualHeight = 800;
  visualResizeListener = null;
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    get: () => layoutHeight,
  });
  Object.defineProperty(window, "visualViewport", {
    configurable: true,
    value: {
      get height() {
        return visualHeight;
      },
      addEventListener: (_event: string, cb: () => void) => {
        visualResizeListener = cb;
      },
      removeEventListener: () => {
        visualResizeListener = null;
      },
    },
  });
});

afterEach(() => {
  Object.defineProperty(window, "visualViewport", {
    configurable: true,
    value: undefined,
  });
});

describe("computeKeyboardCompensation (logique pure)", () => {
  it("compense la partie occluse, bornée par le clavier et plafonnée à 300", () => {
    // Survol (pas de redimensionnement) : compensation historique complète.
    expect(computeKeyboardCompensation(280, 800, 520)).toBe(280);
    // WebView déjà redimensionnée : rien à compenser.
    expect(computeKeyboardCompensation(280, 520, 520)).toBe(0);
    // Occlusion partielle : le reliquat seulement.
    expect(computeKeyboardCompensation(280, 800, 680)).toBe(120);
    // Occlusion supérieure au clavier (autre chrome) : borné au clavier.
    expect(computeKeyboardCompensation(280, 800, 300)).toBe(280);
    // Plafond historique de 300px.
    expect(computeKeyboardCompensation(400, 800, 400)).toBe(300);
    // Sans visualViewport : repli historique (hauteur du clavier).
    expect(computeKeyboardCompensation(280, 800, null)).toBe(280);
    expect(computeKeyboardCompensation(400, 800, null)).toBe(300);
  });
});

describe("useKeyboardAvoidance", () => {
  it("est inactif sur le web (aucun écouteur, toujours 0)", () => {
    h.native = false;
    const { result } = renderHook(() => useKeyboardAvoidance());
    expect(result.current).toBe(0);
    expect(h.listeners.size).toBe(0);
  });

  it("clavier en survol : compensation complète, retirée à la fermeture", () => {
    const { result } = renderHook(() => useKeyboardAvoidance());
    visualHeight = 520; // 800 − 520 = 280 occlus
    fireDidShow(280);
    expect(result.current).toBe(280);
    fireDidHide();
    expect(result.current).toBe(0);
  });

  it("WebView redimensionnée nativement : aucune compensation", () => {
    const { result } = renderHook(() => useKeyboardAvoidance());
    layoutHeight = 520;
    visualHeight = 520;
    fireDidShow(280);
    expect(result.current).toBe(0);
  });

  it("redimensionnement natif tardif : la compensation se retire d'elle-même", () => {
    const { result } = renderHook(() => useKeyboardAvoidance());
    visualHeight = 520;
    fireDidShow(280);
    expect(result.current).toBe(280);
    // Le natif finit de redimensionner : la fenêtre passe à 520.
    layoutHeight = 520;
    fireVisualResize();
    expect(result.current).toBe(0);
  });
});
