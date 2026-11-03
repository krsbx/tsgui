import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

/**
 * Layering rules from docs/ARCHITECTURE.md, mechanically enforced:
 *
 *   layout | fonts | animation | core | interactions | paint | widgets
 *                                      → pure TS, never import bindings/platform
 *   devtools                           → tooling umbrella: the FFI setup
 *                                        (src/ffi) may dlopen; the inspector
 *                                        (src/inspect + tests) stays pure TS
 *   gpu                                → bindings only (renderer over SDL)
 *   platform                           → bindings only
 *   bindings                           → nothing from this repo
 *
 * Pure layers stay testable with no window, no GPU, no native code.
 */
const PURE_LAYERS = [
  "packages/layout",
  "packages/fonts",
  "packages/animation",
  "packages/core",
  "packages/interactions",
  "packages/paint",
  "packages/widgets",
];

/** The pure-TS import ban, shared by the pure layers and devtools' inspector. */
const PURE_TS_IMPORTS = {
  "no-restricted-imports": [
    "error",
    {
      patterns: [
        {
          group: [
            "@vulcania/bindings",
            "@vulcania/platform",
            "bun:ffi",
            "node:ffi",
          ],
          message:
            "layering: this package must stay pure TS — see docs/ARCHITECTURE.md",
        },
      ],
    },
  ],
} as const;

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
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/explicit-member-accessibility": [
        "error",
        { accessibility: "explicit" },
      ],
    },
  },
  ...PURE_LAYERS.map((layer) => ({
    files: [`${layer}/**/*.ts`],
    rules: { ...PURE_TS_IMPORTS },
  })),
  {
    // The devtools umbrella is tooling: src/ffi dlopens SDL on purpose,
    // but the inspector server and its tests stay pure TS.
    files: [
      "packages/devtools/src/inspect/**/*.ts",
      "packages/devtools/test/**/*.ts",
    ],
    rules: { ...PURE_TS_IMPORTS },
  },
  {
    files: ["packages/platform/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@vulcania/gpu",
                "@vulcania/layout",
                "@vulcania/widgets",
                "@vulcania/devtools",
              ],
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
              group: ["@vulcania/*"],
              message: "layering: bindings must not import other repo packages",
            },
          ],
        },
      ],
    },
  },
];
