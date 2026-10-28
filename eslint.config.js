import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "no-empty-pattern": "warn",
      // `error` (et non `warn`) : une violation fait planter TOUT le rendu
      // (l'ErrorBoundary racine remplace l'app par « Une erreur inattendue »).
      // Deux cas réels ont été trouvés (RouteGuard dans App.tsx, CulteDetail)
      // où un hook suivait un `return` précoce → écran noir / E2E jamais vert.
      "react-hooks/rules-of-hooks": "error",
    },
  },
  {
    files: ['src/capabilities/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['@/pages/**', '@/components/**'],
            message: 'Capabilities must not depend on UI components or pages',
          },
        ],
      }],
    },
  },
  {
    // Les fixtures Playwright reçoivent un paramètre nommé `use` (callback de
    // fixture) : `react-hooks/rules-of-hooks` le prend à tort pour un hook.
    // Ce ne sont PAS des composants React.
    files: ['e2e/**/*.{ts,tsx}'],
    rules: {
      'react-hooks/rules-of-hooks': 'off',
    },
  },
  {
    // Les specs Cypress utilisent la syntaxe d'assertion Chai
    // (`expect(x).to.be.a('string').and.not.be.empty`) : les accès de
    // propriété finaux sont des instructions-expression valides du DSL Chai.
    // `no-unused-expressions` (règle TS) les signale à tort. Sans cette
    // exception, le job « Lint Check » échouait en CI sur 9 faux positifs
    // (cypress/e2e/cross-tenant.cy.ts, rbac-gates.cy.ts, support/view.ts).
    files: ['cypress/**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser, cy: 'readonly', Cypress: 'readonly' },
    },
    rules: {
      '@typescript-eslint/no-unused-expressions': 'off',
    },
  }
);
