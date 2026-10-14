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
  // Um SidebarTrigger, ou o setOpen e o setOpenMobile do useSidebar, numa página
  // alternariam sem passar por useAlternarNavegacao: não animariam no clique, e a
  // página voltaria a saber da sidebar.
  test("os controles da sidebar só aparecem em components/casca", () => {
    const fora = [...new Glob("**/*.{ts,tsx}").scanSync(SRC)].filter(
      (a) =>
        !a.startsWith("components/casca/") &&
        ALTERNAR.test(readFileSync(join(SRC, a), "utf8"))
    );
    expect(fora).toEqual([]);
  });
});

describe("a pílula anda no clique", () => {
  // Com loading.tsx, a navegação pré-buscada confirma na hora, o usePathname muda e
  // a pílula desliza antes de a página chegar. Sem ele, desliza só com a resposta.
  test("toda rota do menu tem loading.tsx", () => {
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
  // O botão do banner é o botão principal da casca: clareia e brilha sob o cursor.
  // Uma cópia local com buttonVariants() escurecia e perdia o brilho.
  test("o banner usa o BOTAO da casca", () => {
    const banner = ler("components/meus-cursos/banner-continuar.tsx");
    expect(banner).toMatch(IMPORT_DO_BOTAO);
    expect(banner).not.toContain("buttonVariants");
  });

  // A pílula do item ativo lê o token da sidebar, e o token é o Sol.
  test("a pílula usa sidebar-primary, e sidebar-primary é o Sol", () => {
    expect(ler("components/casca/nav-principal.tsx")).toContain(
      "bg-sidebar-primary"
    );
    const css = readFileSync(GLOBALS, "utf8");
    expect(valorDoToken(css, "sidebar-primary")).toBe(valorDoToken(css, "sol"));
  });

  // O menu da conta abre em popover, como todo menu do shadcn, não em cartão.
  test("o menu do cartão de conta não usa bg-card", () => {
    expect(ler("components/casca/cartao-de-conta.tsx")).not.toContain(
      "bg-card"
    );
  });
});

// O que vem entre o import e o from de "motion/react" ou "motion/react-client", em
// qualquer forma: nomes, alias ou namespace.
const IMPORTA_MOTION =
  /import\s+([^;"'`]*?)\s*from\s*["']motion\/react(?:-client)?["']/g;
const NOMES_IMPORTADOS = /\{([^}]*)\}/;
const ALIAS = /\s+as\s+/;
const IMPORT_DE_TIPO = /^type\s+/;
const TEXTO = /"([^"\n]*)"|'([^'\n]*)'|`([^`]*)`/g;
const ESPACOS = /\s+/;
const TESTE = /\.test\.tsx?$/;
// O ! do Tailwind no fim (size-8!), no começo (!size-8) ou depois da variante
// (hover:!bg-sol), procurado só dentro de texto, para não pegar o !x do código.
const CLASSE_IMPORTANTE = /^!\S|:!\S|\S!$/;

// O motion importado: pelo nome, mesmo com alias, ou pelo namespace inteiro (*).
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
  // O motion.* puxa o Motion inteiro para toda página logada; o m.* dentro do
  // LazyMotion carrega só as animações de domAnimation.
  test("o app importa do Motion só o m, o LazyMotion e o que não é componente", () => {
    // Os testes ficam de fora: este mesmo arquivo cita os imports que acusa.
    const arquivos = [...new Glob("**/*.{ts,tsx}").scanSync(SRC)].filter(
      (a) => !TESTE.test(a)
    );
    expect(
      arquivos.some((a) => [...ler(a).matchAll(IMPORTA_MOTION)].length > 0)
    ).toBeTrue();
    expect(arquivos.flatMap((a) => motionsImportados(ler(a)))).toEqual([]);
  });

  // Com um ! contra outro, o item só saía certo se a classe dele viesse depois da
  // do SidebarMenuButton; as classes da navegação agora não anulam nenhuma.
  test("nenhuma classe da navegação usa !", () => {
    expect(
      classesImportantes(ler("components/casca/nav-principal.tsx"))
    ).toEqual([]);
  });

  // As duas guardas acima só valem se reconhecem cada forma de escrever a mesma coisa.
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
