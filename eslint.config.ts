import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

/**
 * Layering rules from docs/ARCHITECTURE.md, mechanically enforced:
 *
 *   layout | widgets | devtools        → pure TS, never import bindings/platform
 *   gpu                                → bindings only (renderer over SDL)
 *   platform                           → bindings only
 *   bindings                           → nothing from this repo
 *
 * Pure layers stay testable with no window, no GPU, no native code.
 */
const PURE_LAYERS = ["packages/layout", "packages/widgets", "packages/devtools"];

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/generated/**",
      "**/*.d.ts",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  ...PURE_LAYERS.map((layer) => ({
    files: [`${layer}/**/*.ts`],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@tsgui/bindings", "@tsgui/platform", "bun:ffi", "node:ffi"],
              message:
                "layering: this package must stay pure TS — see docs/ARCHITECTURE.md",
            },
          ],
        },
      ],
    },
  })),
  {
    files: ["packages/platform/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@tsgui/gpu", "@tsgui/layout", "@tsgui/widgets", "@tsgui/devtools"],
              message: "layering: platform sits below the toolkit layers",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["packages/bindings/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@tsgui/*"],
              message: "layering: bindings must not import other repo packages",
            },
          ],
        },
      ],
    },
  },
];
