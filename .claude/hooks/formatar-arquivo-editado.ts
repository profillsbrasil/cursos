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

const EXTENSOES_DO_OXFMT = new Set([
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

const EXTENSOES_DO_OXLINT = new Set([
  ".cjs",
  ".js",
  ".jsx",
  ".mjs",
  ".ts",
  ".tsx",
]);

const raiz = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const evento = JSON.parse(readFileSync(0, "utf8"));

const alvoDoHook = (arquivo: unknown) => {
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
    !EXTENSOES_DO_OXFMT.has(extname(absoluto)) ||
    !existsSync(absoluto)
  ) {
    return;
  }

  return absoluto;
};

const raizDoArquivo = (arquivo: string) => {
  const git = spawnSync(
    "git",
    ["-C", dirname(arquivo), "rev-parse", "--show-toplevel"],
    { encoding: "utf8" }
  );

  return git.status === 0 ? git.stdout.trim() : raiz;
};

const binario = (base: string, nome: string) => {
  const local = join(base, "node_modules/.bin", nome);

  return existsSync(local) ? local : join(raiz, "node_modules/.bin", nome);
};

const rodar = (base: string, nome: string, argumentos: string[]) =>
  spawnSync(binario(base, nome), argumentos, {
    cwd: base,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

const alvo = alvoDoHook(evento.tool_input?.file_path);

if (alvo) {
  const base = raizDoArquivo(alvo);

  const oxfmt = rodar(base, "oxfmt", [
    "--write",
    "--no-error-on-unmatched-pattern",
    alvo,
  ]);

  const oxlint = EXTENSOES_DO_OXLINT.has(extname(alvo))
    ? rodar(base, "oxlint", ["--fix", "--no-error-on-unmatched-pattern", alvo])
    : null;

  const falhas = [oxfmt, oxlint].filter(
    (processo) => processo !== null && processo.status !== 0
  );

  // Em PostToolUse, exit 1 só mostra um aviso ao user, e o modelo não lê o
  // stderr. O additionalContext chega ao modelo junto do resultado da tool.
  if (falhas.length === 0) {
    process.stdout.write(`${oxfmt.stdout}${oxlint?.stdout ?? ""}`);
  } else {
    const saida = falhas
      .map((processo) => `${processo?.stdout}${processo?.stderr}`)
      .join("\n")
      .trim();

    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          additionalContext: `O oxfmt ou o Oxlint deixaram erros que o --write e o --fix não corrigem em ${relative(base, alvo)}:\n${saida}`,
          hookEventName: "PostToolUse",
        },
      })
    );
  }
}
