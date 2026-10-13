import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Glob } from "bun";

import { ITENS_DO_ADMIN } from "../admin/menu";
import { ITENS_DO_ALUNO } from "../aluno/menu";

const SRC = join(import.meta.dir, "../..");
const APP = join(SRC, "app");
const ALTERNAR = /\b(SidebarTrigger|SidebarProvider|toggleSidebar)\b/;
const ARQUIVO_DE_LOADING = /\/loading\.tsx$/;
const GRUPO_DE_ROTA = /\/\([^)]+\)/g;

describe("um jeito só de alternar a navegação", () => {
  // Um SidebarTrigger numa página alternaria sem passar por useAlternarNavegacao:
  // não animaria no clique, e a página voltaria a saber da sidebar.
  test("SidebarTrigger, SidebarProvider e toggleSidebar só aparecem em components/casca", () => {
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
    expect(rotas).toHaveLength(5);
    const comLoading = new Set(
      [...new Glob("**/loading.tsx").scanSync(APP)].map((a) =>
        `/${a.replace(ARQUIVO_DE_LOADING, "")}`.replace(GRUPO_DE_ROTA, "")
      )
    );
    expect(rotas.filter((href) => !comLoading.has(href))).toEqual([]);
  });
});
