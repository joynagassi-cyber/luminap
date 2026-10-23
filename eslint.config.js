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
      "react-hooks/rules-of-hooks": "warn",
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
