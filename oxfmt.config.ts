import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

export default defineConfig({
  ...ultracite,
  ignorePatterns: [
    ...ultracite.ignorePatterns,
    "docs/prototipos/**",
    ".claude/settings.local.json",
    ".impeccable/config.json",
    "**/*.md",
    "tools/oxlint/anti-slop/**",
  ],
});
