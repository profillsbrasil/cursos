import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import next from "ultracite/oxlint/next";
import react from "ultracite/oxlint/react";

const SO_SERVICES_IMPORTA_DB = {
  group: ["@cursos/db", "@cursos/db/**", "**/packages/db/**"],
  message:
    "Só src/services.ts importa @cursos/db. Leia e grave pelo caller de src/server/api.ts.",
};

const SO_CONTEXT_E_API_IMPORTAM_SERVICES = {
  group: ["@/services", "**/services"],
  message:
    "Só src/context.ts e src/server/api.ts importam os serviços. Use os carregadores de src/server/api.ts.",
};

export default defineConfig({
  env: core.env,
  extends: [core, react, next],
  ignorePatterns: [
    ...core.ignorePatterns,
    "docs/prototipos/**",
    ".claude/settings.local.json",
    ".impeccable/config.json",
    "packages/ui/src/components/**",
    "packages/ui/src/hooks/**",
    "packages/ui/src/lib/utils.ts",
    "apps/web/public/**",
  ],
  overrides: [
    {
      files: ["**/*.test.ts", "**/*.test.tsx"],
      rules: {
        "nextjs/no-html-link-for-pages": "off",
        "no-loop-func": "off",
        "no-new-func": "off",
        "react/no-clone-element": "off",
      },
    },
    {
      files: ["apps/web/**"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              SO_SERVICES_IMPORTA_DB,
              SO_CONTEXT_E_API_IMPORTAM_SERVICES,
            ],
          },
        ],
      },
    },
    {
      files: ["apps/web/src/services.ts"],
      rules: {
        "no-restricted-imports": [
          "error",
          { patterns: [SO_CONTEXT_E_API_IMPORTAM_SERVICES] },
        ],
      },
    },
    {
      files: ["apps/web/src/context.ts", "apps/web/src/server/api.ts"],
      rules: {
        "no-restricted-imports": [
          "error",
          { patterns: [SO_SERVICES_IMPORTA_DB] },
        ],
      },
    },
  ],
  rules: {
    complexity: "off",
    "func-style": "off",
    "import/consistent-type-specifier-style": "off",
    "import/no-cycle": "off",
    "jsx-a11y/control-has-associated-label": "off",
    "jsx-a11y/prefer-tag-over-role": "off",
    "logical-assignment-operators": "off",
    "no-inline-comments": "off",
    "no-promise-executor-return": "off",
    "no-use-before-define": "off",
    "no-warning-comments": "off",
    "node/callback-return": "off",
    "prefer-named-capture-group": "off",
    "promise/always-return": "off",
    "promise/avoid-new": "off",
    "promise/catch-or-return": "off",
    "promise/no-return-wrap": "off",
    "promise/param-names": "off",
    "promise/prefer-await-to-callbacks": "off",
    "promise/prefer-catch": "off",
    "react/hook-use-state": "off",
    "react/jsx-handler-names": "off",
    "react/jsx-no-constructed-context-values": "off",
    "react/no-unescaped-entities": "off",
    "react/preserve-manual-memoization": "off",
    "react/refs": "off",
    "react/rule-suppression": "off",
    "require-await": "off",
    "require-unicode-regexp": "off",
    "unicorn/catch-error-name": "off",
    "unicorn/consistent-function-scoping": "off",
    "unicorn/custom-error-definition": "off",
    "unicorn/import-style": "off",
    "unicorn/no-array-fill-with-reference-type": "off",
    "unicorn/no-array-for-each": "off",
    "unicorn/no-array-reduce": "off",
    "unicorn/no-array-reverse": "off",
    "unicorn/no-array-sort": "off",
    "unicorn/no-await-expression-member": "off",
    "unicorn/no-hex-escape": "off",
    "unicorn/no-new-array": "off",
    "unicorn/no-object-as-default-parameter": "off",
    "unicorn/no-unreadable-array-destructuring": "off",
    "unicorn/no-useless-collection-argument": "off",
    "unicorn/no-useless-undefined": "off",
    "unicorn/prefer-add-event-listener": "off",
    "unicorn/prefer-array-find": "off",
    "unicorn/prefer-code-point": "off",
    "unicorn/prefer-math-min-max": "off",
    "unicorn/prefer-native-coercion-functions": "off",
    "unicorn/prefer-number-coercion": "off",
    "unicorn/prefer-query-selector": "off",
    "unicorn/prefer-spread": "off",
    "unicorn/prefer-string-replace-all": "off",
    "unicorn/switch-case-braces": "off",
    "unicorn/text-encoding-identifier-case": "off",
  },
});
