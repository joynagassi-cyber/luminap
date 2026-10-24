import { describe, it, expect } from "vitest";
import {
  JSONB_COLUMNS,
  coerceJsonbColumns,
  coerceJsonbValue,
  parseJsonbValue,
} from "@/lib/jsonb";

/**
 * Défaut de départ (mesuré en base `hhgovvrnalibhgpakswi`) : le client
 * sérialisait les colonnes jsonb avant écriture, ce qui produisait des
 * valeurs de type `string` (`"\"[]\""`) au lieu de `array`/`object`.
 * À la relecture, le premier `.map()` de l'UI levait et faisait tomber
 * l'écran. Ces tests verrouillent les deux moitiés du correctif :
 * normalisation à l'écriture, tolérance à la lecture.
 */
describe("jsonb — normalisation à l'écriture (coerceJsonbValue)", () => {
  it("convertit la chaîne d'un tableau JSON en tableau", () => {
    expect(coerceJsonbValue('[]')).toEqual([]);
    expect(coerceJsonbValue('[{"key":"a"}]')).toEqual([{ key: "a" }]);
  });

  it("convertit la chaîne d'un objet JSON en objet", () => {
    expect(coerceJsonbValue('{"amount":1200}')).toEqual({ amount: 1200 });
  });

  it("est idempotent : une valeur déjà structurée est inchangée", () => {
    const arr = [{ key: "a" }];
    expect(coerceJsonbValue(arr)).toBe(arr);
    const obj = { a: 1 };
    expect(coerceJsonbValue(obj)).toBe(obj);
  });

  it("conserve une chaîne scalaire légitime (pas de perte de donnée)", () => {
    // `custom_field_values.value` peut contenir un texte libre.
    expect(coerceJsonbValue("Bonjour")).toBe("Bonjour");
    expect(coerceJsonbValue("12 rue de la Paix")).toBe("12 rue de la Paix");
    // Un nombre sérialisé reste une chaîne : le convertir changerait le type.
    expect(coerceJsonbValue("42")).toBe("42");
  });

  it("conserve les valeurs non-chaînes telles quelles", () => {
    expect(coerceJsonbValue(null)).toBe(null);
    expect(coerceJsonbValue(7)).toBe(7);
    expect(coerceJsonbValue(true)).toBe(true);
  });
});

describe("jsonb — application par colonne (coerceJsonbColumns)", () => {
  it("normalise uniquement les colonnes jsonb déclarées de la table", () => {
    const op = {
      id: "e1",
      name: "Culte",
      budget_items: '[{"label":"Son"}]',
    };
    const out = coerceJsonbColumns("events", op);
    expect(out.budget_items).toEqual([{ label: "Son" }]);
    expect(out.name).toBe("Culte");
    expect(out.id).toBe("e1");
  });

  it("normalise les deux colonnes d'une même table (invitations)", () => {
    const out = coerceJsonbColumns("invitations", {
      grants_payload: "[]",
      tags_payload: '[{"tag_id":"t1"}]',
    });
    expect(out.grants_payload).toEqual([]);
    expect(out.tags_payload).toEqual([{ tag_id: "t1" }]);
  });

  it("renvoie l'objet d'origine si rien ne change (pas de copie inutile)", () => {
    const op = { id: "e1", budget_items: [{ label: "Son" }] };
    expect(coerceJsonbColumns("events", op)).toBe(op);
  });

  it("laisse intactes les tables sans colonne jsonb connue", () => {
    const op = { id: "p1", first_name: "Awa" };
    expect(coerceJsonbColumns("profiles", op)).toBe(op);
  });

  it("ignore une colonne jsonb absente de l'opération", () => {
    const op = { id: "e1", name: "Culte" };
    expect(coerceJsonbColumns("events", op)).toBe(op);
  });

  it("couvre les 9 colonnes jsonb du schéma réel", () => {
    const declared = Object.entries(JSONB_COLUMNS).flatMap(([t, cols]) =>
      cols.map((c) => `${t}.${c}`),
    );
    expect(declared.sort()).toEqual(
      [
        "audit_entries.after_state",
        "audit_entries.before_state",
        "custom_field_definitions.options",
        "events.budget_items",
        "form_definitions.fields",
        "form_submissions.data",
        "invitations.grants_payload",
        "invitations.tags_payload",
        "org_reports.content",
        "report_definitions.filters",
      ].sort(),
    );
  });
});

describe("jsonb — tolérance à la lecture (parseJsonbValue)", () => {
  it("décode un tableau déjà structuré (ligne saine)", () => {
    expect(parseJsonbValue([{ label: "Son" }], [])).toEqual([{ label: "Son" }]);
  });

  it("décode la chaîne historique d'un tableau (ligne corrompue)", () => {
    expect(parseJsonbValue("[]", [])).toEqual([]);
    expect(parseJsonbValue('[{"label":"Son"}]', [])).toEqual([
      { label: "Son" },
    ]);
  });

  it("décode le double encodage imbriqué (jusqu'à 3 niveaux)", () => {
    expect(parseJsonbValue(JSON.stringify(JSON.stringify([])), [])).toEqual([]);
  });

  it("renvoie le fallback au lieu de lever sur une donnée illisible", () => {
    // C'est l'exigence centrale : une donnée corrompue ne doit jamais
    // faire tomber l'écran sur l'error boundary.
    expect(parseJsonbValue("pas du json", [])).toEqual([]);
    expect(parseJsonbValue("{tronqué", [])).toEqual([]);
  });

  it("renvoie le fallback sur valeur absente ou vide", () => {
    expect(parseJsonbValue(null, [])).toEqual([]);
    expect(parseJsonbValue(undefined, {})).toEqual({});
    expect(parseJsonbValue("", [])).toEqual([]);
  });

  it("renvoie le fallback si le type décodé ne correspond pas", () => {
    // Un objet là où un tableau est attendu casserait le `.map()` appelant.
    expect(parseJsonbValue('{"a":1}', [])).toEqual([]);
    expect(parseJsonbValue("[]", {})).toEqual({});
  });

  it("accepte null comme fallback explicite", () => {
    expect(parseJsonbValue(null, null)).toBe(null);
    expect(parseJsonbValue("[]", null)).toEqual([]);
  });
});
