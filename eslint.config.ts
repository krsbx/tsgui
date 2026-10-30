/** @type {import('eslint').Linter.Config[]} */
import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";
// Relative, not the workspace package: Node only strips TypeScript outside
// node_modules.
import { busyhour } from "./packages/eslint-plugin/index.ts";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

export default [
  {
    ignores: [
      "apps/**",
      "dist/**",
      "**/dist/**",
      "build/**",
      "node_modules/**",
      "*.config.*",
      "**/seeders/**",
      "**/migrations/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  ...compat.plugins("react"),
  ...compat.plugins("react-hooks"),
  {
    files: ["packages/**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      parserOptions: {
        project: [
          "./packages/core/tsconfig.json",
          "./packages/admin/tsconfig.json",
          "./packages/console/tsconfig.json",
          "./packages/ui/tsconfig.json",
          "./packages/web/tsconfig.json",
          "./packages/docs/tsconfig.json",
          "./packages/www/tsconfig.json",
          "./packages/protocol/tsconfig.json",
          "./packages/examples/tsconfig.json",
          "./packages/eslint-plugin/tsconfig.json",
          "./packages/backend/tsconfig.json",
          "./packages/backend/src/platforms/workerd/tsconfig.json",
        ],
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      "react-refresh": reactRefresh,
      busyhour,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-return": "error",
      "@typescript-eslint/no-extraneous-class": "off",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/no-inferrable-types": "off",
      "@typescript-eslint/consistent-type-definitions": "error",
      "@typescript-eslint/consistent-indexed-object-style": "error",
      "@typescript-eslint/unified-signatures": "off",
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
      "react-refresh/only-export-components": [
        "error",
        { allowConstantExport: true },
      ],
      // Every list read is paginated, end to end: repo queries take a caller
      // limit, services clamp + page, routes forward the request's page
      // params, and the apps page or bound their api.list* calls.
      "busyhour/paginated-repo-list": "error",
      "busyhour/paginated-service-list": "error",
      "busyhour/paginated-route-list": "error",
      "busyhour/paginated-api-list": "error",
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },
];
