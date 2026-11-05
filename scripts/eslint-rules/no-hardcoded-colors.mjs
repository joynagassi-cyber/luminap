/**
 * Règle ESLint locale « design/no-hardcoded-colors » (plan P1 lot 6).
 *
 * Autonome (aucun import TS) : eslint.config.js l'importe directement, sans
 * dépendre du type-stripping de Node. Les constantes sont réutilisées par
 * `src/design-system/ratchet/ratchet-core.ts` (runner + tests).
 *
 * La règle signale TOUT littéral de couleur dans le code TS/TSX :
 * - chaînes contenant un hex (#rgb…#rrggbbaa) ou rgb()/hsl() ;
 * - props de style inline `style={{ color: "…" }}` dont la valeur n'est pas
 *   un `var(--lu-*)` (couleurs nommées type "red" comprises).
 *
 * La règle est enregistrée « off » dans eslint.config.js : `pnpm lint` ne
 * l'active pas directement. C'est `scripts/design-ratchet.mjs` qui l'active
 * via l'API ESLint, compare les signalements à la baseline figée et ne bloque
 * que les NOUVEAUX littéraux (mode ratchet).
 *
 * Chaque signalement utilise le message brut `design-ratchet <valeur>` afin
 * que le runner puisse reconstituer la valeur exacte pour la baseline.
 */

/** Préfixe des messages émis par la règle (protocole interne du ratchet). */
export const RATCHET_MESSAGE_PREFIX = "design-ratchet ";

/** Hex #rgb, #rgba, #rrggbb, #rrggbbaa. */
export const HEX_RE = /#[0-9a-fA-F]{3,4}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{8}\b/g;
/** Fonctions de couleur CSS. */
export const COLOR_FUNC_RE = /\b(?:rgb|rgba|hsl|hsla)\(/gi;
/** Propriétés de style inline dont une valeur littérale est une couleur. */
export const STYLE_COLOR_KEYS = new Set([
  "color",
  "background",
  "backgroundColor",
  "borderColor",
  "outlineColor",
  "fill",
  "stroke",
  "boxShadow",
  "caretColor",
  "textDecorationColor",
]);

export function isColorLiteral(value) {
  if (typeof value !== "string") return false;
  HEX_RE.lastIndex = 0;
  COLOR_FUNC_RE.lastIndex = 0;
  return HEX_RE.test(value) || COLOR_FUNC_RE.test(value);
}

export const noHardcodedColors = {
  meta: {
    type: "problem",
    schema: [],
    messages: {
      // Le message brut embarque la valeur pour le diff de baseline ; le
      // runner reformate proprement. Ne pas changer le préfixe sans mettre à
      // jour RATCHET_MESSAGE_PREFIX (vérifié au démarrage du runner).
      hardcoded: RATCHET_MESSAGE_PREFIX + "{{value}}",
    },
  },
  create(context) {
    const report = (node, value) =>
      context.report({ node, messageId: "hardcoded", data: { value } });

    return {
      Literal(node) {
        if (isColorLiteral(node.value)) report(node, String(node.value));
      },
      TemplateLiteral(node) {
        for (const quasi of node.quasis) {
          const cooked = quasi.value.cooked ?? quasi.value.raw;
          if (isColorLiteral(cooked)) report(quasi, String(cooked));
        }
      },
      JSXAttribute(node) {
        if (node.name?.name !== "style") return;
        const container = node.value;
        if (
          !container ||
          container.type !== "JSXExpressionContainer" ||
          container.expression.type !== "ObjectExpression"
        ) {
          return;
        }
        for (const prop of container.expression.properties) {
          if (prop.type !== "Property" || prop.computed) continue;
          const key =
            prop.key.type === "Identifier"
              ? prop.key.name
              : prop.key.type === "Literal"
                ? String(prop.key.value)
                : null;
          if (!key || !STYLE_COLOR_KEYS.has(key)) continue;
          const v = prop.value;
          if (
            v.type === "Literal" &&
            typeof v.value === "string" &&
            !v.value.trim().startsWith("var(")
          ) {
            report(prop, `style.${key}:${v.value}`);
          }
        }
      },
    };
  },
};
