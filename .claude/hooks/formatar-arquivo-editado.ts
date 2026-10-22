import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import {
  dirname,
  extname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from "node:path";

const EXTENSOES_DO_BIOME = new Set([
  ".cjs",
  ".css",
  ".js",
  ".json",
  ".jsonc",
  ".jsx",
  ".mjs",
  ".ts",
  ".tsx",
]);

const raiz = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const evento = JSON.parse(readFileSync(0, "utf8"));

const alvoDoBiome = (arquivo: unknown) => {
  if (typeof arquivo !== "string") {
    return;
  }
  const absoluto = resolve(raiz, arquivo);
  const relativo = relative(raiz, absoluto);
  const foraDoProjeto =
    relativo === ".." ||
    relativo.startsWith(`..${sep}`) ||
    isAbsolute(relativo);
  if (
    foraDoProjeto ||
    !EXTENSOES_DO_BIOME.has(extname(absoluto)) ||
    !existsSync(absoluto)
  ) {
    return;
  }
  return absoluto;
};

// Num worktree dentro do projeto, o biome.jsonc dele é outra raiz: rodar o
// Biome da raiz principal acusa "nested root configuration" ou ignora o arquivo.
const raizDoArquivo = (arquivo: string) => {
  const git = spawnSync(
    "git",
    ["-C", dirname(arquivo), "rev-parse", "--show-toplevel"],
    { encoding: "utf8" }
  );
  return git.status === 0 ? git.stdout.trim() : raiz;
};

const binarioDoBiome = (base: string) => {
  const local = join(base, "node_modules/.bin/biome");
  return existsSync(local) ? local : join(raiz, "node_modules/.bin/biome");
};

const alvo = alvoDoBiome(evento.tool_input?.file_path);

if (alvo) {
  const base = raizDoArquivo(alvo);
  const biome = spawnSync(
    binarioDoBiome(base),
    [
      "check",
      "--write",
      "--no-errors-on-unmatched",
      "--files-ignore-unknown=true",
      "--skip=correctness/noUnusedImports",
      alvo,
    ],
    { cwd: base, stdio: ["ignore", "inherit", "inherit"] }
  );
  process.exitCode = biome.status === 0 ? 0 : 1;
}
