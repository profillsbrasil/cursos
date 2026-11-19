import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { Glob } from "bun";
import { compile } from "tailwindcss";

const PACOTE = join(import.meta.dir, "../..");
const GLOBALS = join(import.meta.dir, "globals.css");
const COMPONENTES = join(PACOTE, "src/components");

const ESTILOS_DOS_IMPORTS_DO_GLOBALS: Record<string, string> = {
  "shadcn/tailwind.css": "node_modules/shadcn/dist/tailwind.css",
  tailwindcss: "node_modules/tailwindcss/index.css",
  "tw-animate-css": "node_modules/tw-animate-css/dist/tw-animate.css",
};

function lerEstilo(id: string, base: string) {
  const conhecido = ESTILOS_DOS_IMPORTS_DO_GLOBALS[id];
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
const CLASSE_NO_FIM = /\s\.(?:\\.|[\w-])+$/;

const arquivosPorClasse = new Map<string, string[]>();

for (const arquivo of new Glob("*.tsx").scanSync(COMPONENTES)) {
  const texto = readFileSync(join(COMPONENTES, arquivo), "utf8");

  for (const token of new Set(texto.split(SEPARADOR))) {
    if (token) {
      arquivosPorClasse.set(token, [
        ...(arquivosPorClasse.get(token) ?? []),
        arquivo,
      ]);
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

const saida = compilador.build([...arquivosPorClasse.keys(), ...EXEMPLOS]);

interface Regra {
  classe: string;
  declaracoes: string;
  seletor: string;
}

function dentroDoIs(seletor: string) {
  if (!seletor.startsWith(":is(")) {
    return null;
  }

  let fundo = 0;

  for (let i = 3; i < seletor.length; i += 1) {
    const c = seletor[i];

    if (c === "\\") {
      i += 1;
    } else if (c === "(") {
      fundo += 1;
    } else if (c === ")") {
      fundo -= 1;

      if (fundo === 0) {
        return seletor.slice(4, i);
      }
    }
  }

  return null;
}

function classeDe(seletor: string) {
  const grupo = dentroDoIs(seletor) ?? "";
  const fim = grupo.search(CLASSE_NO_FIM);
  const trecho = fim < 0 ? seletor : grupo.slice(fim);
  let classe = "";
  let i = trecho.search(PRIMEIRO_PONTO) + 1;

  while (i < trecho.length) {
    const c = trecho[i] ?? "";

    if (c === "\\") {
      classe += trecho[i + 1] ?? "";
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

const semClasses = (seletor: string) => seletor.replace(NOME_DE_CLASSE, "");
const casaComFoco = (r: Regra) => semClasses(r.seletor).includes(":focus");
const regrasDe = (classe: string) => regras.filter((r) => r.classe === classe);

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

  test("nenhuma regra dos componentes desenha contorno ou anel no foco", () => {
    const achados = regras.filter(casaComFoco).flatMap((r) => {
      const problema = problemaDe(r);
      const arquivos = (arquivosPorClasse.get(r.classe) ?? []).join(", ");

      return problema ? [`${r.classe} (${arquivos}): ${problema}`] : [];
    });

    expect([...new Set(achados)]).toEqual([]);
  });
});
