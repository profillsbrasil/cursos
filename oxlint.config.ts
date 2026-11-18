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
});
