// @vitest-environment jsdom
/**
 * PM7 — brouillon de saisie longue : la saisie survit à une session expirée /
 * fermeture d'écran, et le brouillon est effacé à la soumission réussie.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  useFormDraft,
  readDraft,
  writeDraft,
  clearDraft,
} from "@/hooks/useFormDraft";

describe("useFormDraft — PM7", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("persiste la saisie et la restaure à la réouverture", () => {
    const first = renderHook(() => useFormDraft<Record<string, unknown>>("form:f1", { nom: "" }));
    act(() => first.result.current.setValue({ nom: "Aya", montant: 1500 }));
    first.unmount();

    const second = renderHook(() => useFormDraft<Record<string, unknown>>("form:f1", { nom: "" }));
    expect(second.result.current.value).toEqual({ nom: "Aya", montant: 1500 });
    expect(second.result.current.restored).toBe(true);
  });

  it("n'annonce PAS de restauration quand aucun brouillon n'existe", () => {
    const { result } = renderHook(() => useFormDraft("form:neuf", { nom: "" }));
    expect(result.current.restored).toBe(false);
    expect(result.current.value).toEqual({ nom: "" });
  });

  it("discard() efface le brouillon et masque l'avis", () => {
    writeDraft("form:f2", { nom: "B" });
    const { result } = renderHook(() => useFormDraft("form:f2", { nom: "" }));
    expect(result.current.restored).toBe(true);

    act(() => result.current.discard());

    expect(result.current.restored).toBe(false);
    expect(readDraft("form:f2")).toBeNull();
  });

  it("n'écrase pas le brouillon restauré au premier rendu", () => {
    writeDraft("form:f3", { nom: "Initial" });
    renderHook(() => useFormDraft("form:f3", { nom: "defaut" }));
    expect(readDraft<{ nom: string }>("form:f3")).toEqual({ nom: "Initial" });
  });

  it("clearDraft retire la clé", () => {
    writeDraft("form:f4", { x: 1 });
    clearDraft("form:f4");
    expect(readDraft("form:f4")).toBeNull();
  });

  it("readDraft ignore une valeur corrompue", () => {
    localStorage.setItem("lumina-draft:bad", "{pas du json");
    expect(readDraft("bad")).toBeNull();
  });
});
