import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { Glob } from "bun";

import { ITENS_DO_ADMIN } from "../admin/menu";
import { ITENS_DO_ALUNO } from "../aluno/menu";

const SRC = join(import.meta.dir, "../..");
const APP = join(SRC, "app");

const ALTERNAR =
  /\b(SidebarTrigger|SidebarProvider|toggleSidebar|setOpen|setOpenMobile)\b/;

const ARQUIVO_DE_LOADING = /\/loading\.tsx$/;
const GRUPO_DE_ROTA = /\/\([^)]+\)/g;

describe("um jeito só de alternar a navegação", () => {
  test("os controles da sidebar só aparecem em components/casca, ou alternariam sem o useAlternarNavegacao e sem animar", () => {
    const fora = [...new Glob("**/*.{ts,tsx}").scanSync(SRC)].filter(
      (a) =>
        !a.startsWith("components/casca/") &&
        ALTERNAR.test(readFileSync(join(SRC, a), "utf8"))
    );

    expect(fora).toEqual([]);
  });
});

describe("a pílula anda no clique", () => {
  test("toda rota do menu tem loading.tsx, para a pílula deslizar antes de a página chegar", () => {
    const rotas = [...ITENS_DO_ALUNO, ...ITENS_DO_ADMIN].flatMap((i) =>
      i.tipo === "link" ? [i.href] : []
    );

    expect(rotas.length).toBeGreaterThan(0);

    const comLoading = new Set(
      [...new Glob("**/loading.tsx").scanSync(APP)].map((a) =>
        `/${a.replace(ARQUIVO_DE_LOADING, "")}`.replace(GRUPO_DE_ROTA, "")
      )
    );

    expect(rotas.filter((href) => !comLoading.has(href))).toEqual([]);
  });
});

const ler = (caminho: string) => readFileSync(join(SRC, caminho), "utf8");
const GLOBALS = join(SRC, "../../../packages/ui/src/styles/globals.css");

const IMPORT_DO_BOTAO =
  /import\s*\{[^}]*\bBOTAO\b[^}]*\}\s*from\s*"@\/components\/casca\/botoes"/;

const valorDoToken = (css: string, nome: string) =>
  new RegExp(`--${nome}:\\s*([^;]+);`).exec(css)?.[1]?.trim();

describe("os desvios da #30 não voltam", () => {
  test("o banner usa o BOTAO da casca, que clareia e brilha sob o cursor, e não um buttonVariants()", () => {
    const banner = ler("components/meus-cursos/banner-continuar.tsx");
    expect(banner).toMatch(IMPORT_DO_BOTAO);
    expect(banner).not.toContain("buttonVariants");
  });

  test("a pílula usa sidebar-primary, e sidebar-primary é o Sol", () => {
    expect(ler("components/casca/nav-principal.tsx")).toContain(
      "bg-sidebar-primary"
    );
    const css = readFileSync(GLOBALS, "utf8");
    expect(valorDoToken(css, "sidebar-primary")).toBe(valorDoToken(css, "sol"));
  });

  test("o menu do cartão de conta abre em popover e não usa bg-card", () => {
    expect(ler("components/casca/cartao-de-conta.tsx")).not.toContain(
      "bg-card"
    );
  });
});

const IMPORTA_MOTION =
  /import\s+([^;"'`]*?)\s*from\s*["']motion\/react(?:-client)?["']/g;

const NOMES_IMPORTADOS = /\{([^}]*)\}/;
const ALIAS = /\s+as\s+/;
const IMPORT_DE_TIPO = /^type\s+/;
const TEXTO = /"([^"\n]*)"|'([^'\n]*)'|`([^`]*)`/g;
const ESPACOS = /\s+/;
const TESTE_QUE_CITA_O_IMPORT = /\.test\.tsx?$/;

const CLASSE_IMPORTANTE = /^!\S|:!\S|\S!$/;

const motionsImportados = (codigo: string) =>
  [...codigo.matchAll(IMPORTA_MOTION)].flatMap(([, clausula = ""]) => {
    const nomes = (NOMES_IMPORTADOS.exec(clausula)?.[1] ?? "")
      .split(",")
      .map((n) => n.trim().replace(IMPORT_DE_TIPO, "").split(ALIAS)[0]);

    return [...nomes, ...(clausula.includes("*") ? ["*"] : [])].filter(
      (n) => n === "motion" || n === "*"
    );
  });

const classesImportantes = (codigo: string) =>
  [...codigo.matchAll(TEXTO)]
    .flatMap(([, a = "", b = "", c = ""]) => `${a} ${b} ${c}`.split(ESPACOS))
    .filter((classe) => CLASSE_IMPORTANTE.test(classe));

describe("a navegação fica leve e sem disputa de classes (#29)", () => {
  test("o app importa do Motion só o m, o LazyMotion e o que não é componente, porque o motion.* puxa o Motion inteiro", () => {
    const arquivos = [...new Glob("**/*.{ts,tsx}").scanSync(SRC)].filter(
      (a) => !TESTE_QUE_CITA_O_IMPORT.test(a)
    );

    expect(
      arquivos.some((a) => [...ler(a).matchAll(IMPORTA_MOTION)].length > 0)
    ).toBeTrue();
    expect(arquivos.flatMap((a) => motionsImportados(ler(a)))).toEqual([]);
  });

  test("o Reorder do Motion, que monta o motion.* por dentro, só entra no material de apoio do editor", () => {
    const comReorder = [...new Glob("**/*.{ts,tsx}").scanSync(SRC)].filter(
      (a) =>
        !TESTE_QUE_CITA_O_IMPORT.test(a) &&
        [...ler(a).matchAll(IMPORTA_MOTION)].some(([, clausula = ""]) =>
          clausula.includes("Reorder")
        )
    );

    expect(comReorder).toEqual(["components/admin/material-de-apoio.tsx"]);
  });

  test("nenhuma classe da navegação usa !, que obrigava o item a vir depois do SidebarMenuButton", () => {
    expect(
      classesImportantes(ler("components/casca/nav-principal.tsx"))
    ).toEqual([]);
  });

  test.each([
    'import { m, motion } from "motion/react";',
    'import { motion as M } from "motion/react";',
    'import * as M from "motion/react";',
    'import { motion } from "motion/react-client";',
  ])("acusa o motion em %s", (codigo) => {
    expect(motionsImportados(codigo)).not.toEqual([]);
  });

  test("não acusa o m e o LazyMotion", () => {
    expect(
      motionsImportados(
        'import { domAnimation, LazyMotion, m, useReducedMotion } from "motion/react";'
      )
    ).toEqual([]);
  });

  test.each([
    'className="size-8!"',
    'className="!size-8"',
    'className="flex hover:!bg-sol"',
    'className="hover:bg-sol! p-2"',
  ])("acusa o ! em %s", (codigo) => {
    expect(classesImportantes(codigo)).not.toEqual([]);
  });

  test("não acusa a negação do código", () => {
    expect(
      classesImportantes(
        '<TooltipContent className={DICA} hidden={!recolhida} side="right">'
      )
    ).toEqual([]);
  });
});
