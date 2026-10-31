// @vitest-environment node
/**
 * Garde anti-récurrence — « hooks de Router hors du Router ».
 *
 * Incident mesuré (2026-10-31, PR15 / #166) : `UsageStatsBridge` appelait
 * `useLocation()` mais était monté **au-dessus** de `<IonReactRouter>` (à côté
 * de `SentryUserBridge`, qui lui n'utilise aucun hook de Router). Résultat :
 * `useLocation() may be used only in the context of a <Router>` levé à CHAQUE
 * rendu, l'ErrorBoundary prenait la main et l'application entière affichait
 * « Une erreur inattendue s'est produite. » — écran noir fonctionnel pour tout
 * le monde, en production, sans qu'aucun test unitaire ne le voie (les tests
 * montaient `UsageStatsBridge`/les pages isolément, jamais l'arbre `App`).
 *
 * Cette garde verrouille la règle au niveau STATIQUE, sur le seul fichier qui
 * monte le Router : dans `src/App.tsx`, tout composant local qui appelle un hook
 * de React Router DOIT être rendu À L'INTÉRIEUR du bloc `<IonReactRouter>`.
 *
 * Sans garde, un futur pont (bridge) ajouté au mauvais niveau recasse l'app
 * entière — panne totale, pas dégradation.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as ts from "typescript";

const APP_PATH = join(process.cwd(), "src", "App.tsx");

/** Hooks de React Router qui exigent un contexte <Router>. */
const ROUTER_HOOKS = new Set([
  "useLocation",
  "useNavigate",
  "useParams",
  "useSearchParams",
  "useRouteMatch",
]);

interface Finding {
  name: string;
  hooks: string[];
  insideRouter: boolean;
}

/** Analyse statique : composants locaux à hooks de Router + leur lieu de montage. */
function analyzeApp(source: string): { findings: Finding[]; routerFound: boolean } {
  const sf = ts.createSourceFile(
    APP_PATH,
    source,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    ts.ScriptKind.TSX,
  );

  // 1. Composants locaux (function Name / const Name = () => …) qui appellent un
  //    hook de Router dans leur corps.
  const hookComponents = new Map<string, string[]>();

  const collectHooks = (node: ts.Node, acc: Set<string>): void => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      if (ROUTER_HOOKS.has(node.expression.text)) acc.add(node.expression.text);
    }
    node.forEachChild((c) => collectHooks(c, acc));
  };

  const register = (name: string, body: ts.Node | undefined): void => {
    if (!body) return;
    const acc = new Set<string>();
    collectHooks(body, acc);
    if (acc.size > 0) hookComponents.set(name, [...acc]);
  };

  const visitDecls = (node: ts.Node): void => {
    if (ts.isFunctionDeclaration(node) && node.name) {
      register(node.name.text, node);
    } else if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (
          ts.isIdentifier(decl.name) &&
          decl.initializer &&
          (ts.isArrowFunction(decl.initializer) ||
            ts.isFunctionExpression(decl.initializer))
        ) {
          register(decl.name.text, decl.initializer);
        }
      }
    }
    node.forEachChild(visitDecls);
  };
  visitDecls(sf);

  // 2. Bornes du bloc <IonReactRouter>…</IonReactRouter>.
  const openIdx = source.indexOf("<IonReactRouter");
  const closeIdx = source.indexOf("</IonReactRouter>");
  const routerFound = openIdx !== -1 && closeIdx !== -1 && closeIdx > openIdx;
  const routerEnd = routerFound ? closeIdx : -1;

  // 3. Lieu de montage de chaque composant à hooks.
  const findings: Finding[] = [];
  const visitJsx = (node: ts.Node): void => {
    let tag: string | null = null;
    let pos = -1;
    if (ts.isJsxSelfClosingElement(node) && ts.isIdentifier(node.tagName)) {
      tag = node.tagName.text;
      pos = node.getStart(sf);
    } else if (ts.isJsxOpeningElement(node) && ts.isIdentifier(node.tagName)) {
      tag = node.tagName.text;
      pos = node.getStart(sf);
    }
    if (tag && hookComponents.has(tag)) {
      findings.push({
        name: tag,
        hooks: hookComponents.get(tag)!,
        insideRouter: routerFound && pos > openIdx && pos < routerEnd,
      });
    }
    node.forEachChild(visitJsx);
  };
  visitJsx(sf);

  return { findings, routerFound };
}

describe("router-context-guard — hooks de Router montés sous <IonReactRouter>", () => {
  const source = readFileSync(APP_PATH, "utf8");
  const { findings, routerFound } = analyzeApp(source);

  it("trouve bien le bloc <IonReactRouter> (garde non vacuité)", () => {
    expect(routerFound, "App.tsx doit monter <IonReactRouter>").toBe(true);
  });

  it("détecte au moins un composant à hooks de Router (garde non vacuité)", () => {
    // `RouteGuard` (useLocation/useNavigate) et `UsageStatsBridge`
    // (useLocation) sont des cas réels : si l'analyse n'en trouve AUCUN, c'est
    // la garde elle-même qui est cassée, pas le code.
    expect(findings.length).toBeGreaterThan(0);
    const names = findings.map((f) => f.name);
    expect(names).toContain("RouteGuard");
    expect(names).toContain("UsageStatsBridge");
  });

  it("n'utilise AUCUN hook de Router hors du <IonReactRouter>", () => {
    const offenders = findings.filter((f) => !f.insideRouter);
    const detail = offenders
      .map((o) => `${o.name} (${o.hooks.join(", ")})`)
      .join(" | ");
    expect(
      offenders,
      `Composant(s) appelant un hook de Router hors <IonReactRouter> : ${detail}. ` +
        "Un tel montage fait tomber TOUTE l'application dans l'ErrorBoundary " +
        "(« Une erreur inattendue s'est produite »).",
    ).toEqual([]);
  });

  it("garde le filet : un montage hors Router serait détecté (test négatif)", () => {
    // Preuve de non-vacuité : on simule la régression d'origine — un composant
    // `FakeBridge` qui appelle `useLocation()` monté AU-DESSUS du Router.
    const broken = source.replace(
      "<IonApp style={{ backgroundColor: \"var(--canvas)\" }}>",
      "<IonApp style={{ backgroundColor: \"var(--canvas)\" }}><FakeBridge />",
    ).replace(
      "const UsageStatsBridge = () => {",
      "const FakeBridge = () => { useLocation(); return null; };\nconst UsageStatsBridge = () => {",
    );
    const res = analyzeApp(broken);
    const fake = res.findings.find((f) => f.name === "FakeBridge");
    expect(fake, "la sonde FakeBridge doit être détectée").toBeDefined();
    expect(fake!.insideRouter, "la sonde hors Router doit être signalée").toBe(false);
  });
});
