// O foco de teclado é o hover (#30). Compila o globals.css real com o Tailwind do
// pacote e as classes de todos os componentes, e confere o CSS que chega ao
// navegador: todo hover: também vale no foco de teclado, focus-visible: não casa com
// nada, e nenhuma regra que casa com um elemento focado desenha contorno ou anel.

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Glob } from "bun";
import { compile } from "tailwindcss";

const PACOTE = join(import.meta.dir, "../..");
const GLOBALS = join(import.meta.dir, "globals.css");
const COMPONENTES = join(PACOTE, "src/components");

// Os @import do globals.css, pelo id que ele escreve.
const ESTILOS: Record<string, string> = {
  "shadcn/tailwind.css": "node_modules/shadcn/dist/tailwind.css",
  tailwindcss: "node_modules/tailwindcss/index.css",
  "tw-animate-css": "node_modules/tw-animate-css/dist/tw-animate.css",
};

function lerEstilo(id: string, base: string) {
  const conhecido = ESTILOS[id];
  const caminho = conhecido ? join(PACOTE, conhecido) : join(base, id);
  return Promise.resolve({
    base: dirname(caminho),
    content: readFileSync(caminho, "utf8"),
    path: caminho,
  });
}

const ESPACO = /\s+/g;
const SEPARADOR = /[\s"'`]+/;
const PRIMEIRO_PONTO = /(?<!\\)\./;
const CARACTERE_DE_CLASSE = /[\w-]/;
const NOME_DE_CLASSE = /\.(?:\\.|[\w-])+/g;
const FOCO = /:focus/;

/** Cada classe dos componentes, com os arquivos em que aparece. */
const origem = new Map<string, string[]>();
for (const arquivo of new Glob("*.tsx").scanSync(COMPONENTES)) {
  const texto = readFileSync(join(COMPONENTES, arquivo), "utf8");
  for (const token of new Set(texto.split(SEPARADOR))) {
    if (token) {
      origem.set(token, [...(origem.get(token) ?? []), arquivo]);
    }
  }
}

const EXEMPLOS = [
  "hover:bg-muted",
  "group-hover:opacity-0",
  "focus-visible:ring-1",
];
const compilador = await compile(readFileSync(GLOBALS, "utf8"), {
  base: dirname(GLOBALS),
  loadStylesheet: lerEstilo,
});
const saida = compilador.build([...origem.keys(), ...EXEMPLOS]);

interface Regra {
  classe: string;
  declaracoes: string;
  seletor: string;
}

/** `.hover\:bg-muted:is(...)` vira `hover:bg-muted`: a primeira classe, sem escapes. */
function classeDe(seletor: string) {
  let classe = "";
  let i = seletor.search(PRIMEIRO_PONTO) + 1;
  while (i < seletor.length) {
    const c = seletor[i] ?? "";
    if (c === "\\") {
      classe += seletor[i + 1] ?? "";
      i += 2;
    } else if (CARACTERE_DE_CLASSE.test(c)) {
      classe += c;
      i += 1;
    } else {
      break;
    }
  }
  return classe;
}

/**
 * Cada regra com as declarações dela, inclusive as que o Tailwind aninha num
 * @supports dentro da regra. O @media que envolve uma regra não conta como seletor.
 */
function regrasDoCss(css: string): Regra[] {
  const porSeletor = new Map<string, string[]>();
  const pilha: string[] = [];
  let trecho = "";
  for (const c of css) {
    if (c === "{") {
      pilha.push(trecho.trim());
      trecho = "";
    } else if (c === "}" || c === ";") {
      const declaracao = trecho.trim();
      const seletor = pilha.findLast((p) => !p.startsWith("@"));
      if (declaracao && seletor) {
        porSeletor.set(seletor, [
          ...(porSeletor.get(seletor) ?? []),
          declaracao,
        ]);
      }
      if (c === "}") {
        pilha.pop();
      }
      trecho = "";
    } else {
      trecho += c;
    }
  }
  return [...porSeletor].map(([seletor, declaracoes]) => ({
    classe: classeDe(seletor),
    declaracoes: declaracoes.join("; ").replace(ESPACO, " "),
    seletor,
  }));
}

const regras = regrasDoCss(saida.slice(saida.indexOf("@layer utilities")));

/** O seletor sem os nomes de classe, que podem conter a palavra focus. */
const semClasses = (seletor: string) => seletor.replace(NOME_DE_CLASSE, "");
const casaComFoco = (r: Regra) => FOCO.test(semClasses(r.seletor));
const regrasDe = (classe: string) => regras.filter((r) => r.classe === classe);

/** Separa as variantes do utilitário, sem cortar dentro de [] ou (). */
function partes(classe: string) {
  const segmentos: string[] = [];
  let atual = "";
  let fundo = 0;
  for (const c of classe) {
    if (c === "[" || c === "(") {
      fundo += 1;
    }
    if (c === "]" || c === ")") {
      fundo -= 1;
    }
    if (c === ":" && fundo === 0) {
      segmentos.push(atual);
      atual = "";
    } else {
      atual += c;
    }
  }
  return { utilitario: atual, variantes: segmentos };
}

const HOVER = /^(?:group-|peer-)?hover(?:\/[\w-]+)?$/;
const ehHover = (classe: string) =>
  partes(classe).variantes.some((v) => HOVER.test(v));

const CONTORNO = /(?:^|;\s*)(?:--tw-)?outline(?:-[a-z]+)?:(?!\s*none\b)/;
const LARGURA_DO_ANEL =
  /--tw-(?:inset-)?ring-shadow:[^;]*calc\((\d+(?:\.\d+)?)px/;
const COR_DO_ANEL = /--tw-ring-color:\s*([^;]+)/g;
const TOKEN_DO_ANEL = /var\(--(?:sidebar-)?ring\)|^transparent$/;

const coresDoAnel = (r: Regra) =>
  [...r.declaracoes.matchAll(COR_DO_ANEL)].map((m) => (m[1] ?? "").trim());

/** Uma cor de anel da mesma variante que lê o token transparente. */
function temCorTransparente(classe: string) {
  const prefixo = partes(classe).variantes.join(":");
  return regras.some((r) => {
    const cores = coresDoAnel(r);
    return (
      partes(r.classe).variantes.join(":") === prefixo &&
      cores.length > 0 &&
      cores.every((cor) => TOKEN_DO_ANEL.test(cor))
    );
  });
}

/** O que a regra desenha no foco, ou null quando ela pode estar ali. */
function problemaDe(r: Regra) {
  if (CONTORNO.test(r.declaracoes)) {
    return "contorno";
  }
  if (ehHover(r.classe)) {
    return null;
  }
  const cor = coresDoAnel(r).find((c) => !TOKEN_DO_ANEL.test(c));
  if (cor) {
    return `anel em ${cor}`;
  }
  const largura = Number(LARGURA_DO_ANEL.exec(r.declaracoes)?.[1] ?? 0);
  if (largura > 0 && !temCorTransparente(r.classe)) {
    return `anel de ${largura}px`;
  }
  return null;
}

const valorDoToken = (nome: string) =>
  new RegExp(`--${nome}:\\s*([^;]+);`)
    .exec(readFileSync(GLOBALS, "utf8"))?.[1]
    ?.trim();

describe("o foco de teclado é o hover", () => {
  test("hover: também casa com o foco de teclado", () => {
    for (const classe of ["hover:bg-muted", "group-hover:opacity-0"]) {
      expect(regrasDe(classe).some(casaComFoco)).toBe(true);
    }
  });

  test("focus-visible: não casa com nada", () => {
    const seletores = regrasDe("focus-visible:ring-1").map((r) =>
      semClasses(r.seletor)
    );
    expect(seletores).toEqual([":not(*)"]);
  });

  test("os tokens do anel são transparentes", () => {
    expect(valorDoToken("ring")).toBe("transparent");
    expect(valorDoToken("sidebar-ring")).toBe("transparent");
  });

  // Aceita a cópia do hover, o destaque de menu (focus:bg-*, focus:text-*), a borda e
  // o anel que leem o token transparente. Contorno não passa nem vindo do hover.
  test("nenhuma regra dos componentes desenha contorno ou anel no foco", () => {
    const achados = regras.filter(casaComFoco).flatMap((r) => {
      const problema = problemaDe(r);
      const arquivos = (origem.get(r.classe) ?? []).join(", ");
      return problema ? [`${r.classe} (${arquivos}): ${problema}`] : [];
    });
    expect([...new Set(achados)]).toEqual([]);
  });
});
