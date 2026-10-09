import { describe, expect, mock, test } from "bun:test";
import type { CursoNaVisao } from "@cursos/api/dominio/catalogo";
import {
  type EdicaoDaTrilha,
  edicaoDeTrilhaNova,
} from "@cursos/api/dominio/edicao-da-trilha";
import type { CursoId, TrilhaId, Versao } from "@cursos/api/dominio/tipos";
import { renderToStaticMarkup } from "react-dom/server";

// Fora do App Router o useRouter lança; o resto do módulo fica o de verdade.
const navegacao = await import("next/navigation");
mock.module("next/navigation", () => ({
  ...navegacao,
  useRouter: () => ({ push: () => undefined, refresh: () => undefined }),
}));

const { EditorDaTrilha } = await import("./editor-da-trilha");

const TAG = /<[^>]+>/g;
const texto = (html: string) => html.replace(TAG, " ").replace(/\s+/g, " ");
const BOTAO = /<button[^>]*>/g;
/** O botão com este aria-label está desabilitado? */
const desabilitado = (html: string, rotulo: string) => {
  const tag = html
    .match(BOTAO)
    ?.find((b) => b.includes(`aria-label="${rotulo}"`));
  if (!tag) {
    throw new Error(`sem botão "${rotulo}"`);
  }
  return tag.includes(' disabled=""');
};

const TRILHA = "t1" as TrilhaId;
const curso = (
  id: string,
  titulo: string,
  status: CursoNaVisao["status"] = "publicado"
): CursoNaVisao => ({
  aulas: 2,
  id: id as CursoId,
  precoTroca: null,
  status,
  titulo,
  trilha: { id: TRILHA, posicao: 1, titulo: "Operador" },
});
const CURSOS = [
  curso("c1", "Segurança do posto"),
  curso("c2", "Envasadora", "em_producao"),
];

const existente = (alunos: number, podeApagar: boolean): EdicaoDaTrilha => ({
  documento: {
    cursos: ["c1" as CursoId, "c2" as CursoId],
    descricao: "Do posto à máquina.",
    id: TRILHA,
    slug: "operador",
    titulo: "Operador",
    versao: "v1" as Versao,
  },
  podeApagar,
  uso: {
    alunosComATrilha: alunos,
    comecaramSoPelaTrilha: [],
    conclusoes: 0,
    liberacoes: alunos,
  },
});

describe("editor da trilha", () => {
  test("trilha nova abre vazia, com Criar trilha e sem a parte de apagar", () => {
    const html = renderToStaticMarkup(
      <EditorDaTrilha cursos={CURSOS} edicao={edicaoDeTrilhaNova(TRILHA)} />
    );
    const t = texto(html);
    expect(t).toContain("Nova trilha");
    expect(t).toContain("0 cursos");
    expect(t).toContain("Nenhum curso ainda.");
    expect(t).toContain("Criar trilha");
    expect(t).not.toContain("Apagar a trilha");
  });

  test("trilha liberada mostra os cursos em ordem, o aviso de quem tem e por que não se apaga", () => {
    const html = renderToStaticMarkup(
      <EditorDaTrilha cursos={CURSOS} edicao={existente(3, false)} />
    );
    const t = texto(html);
    expect(t).toContain("1 1º: Segurança do posto");
    expect(t).toContain("2 2º: Envasadora Em produção");
    expect(t).toContain(
      "3 pessoas têm esta trilha liberada, e a mudança vale na hora."
    );
    expect(t).toContain("não se apaga");
    expect(
      [
        "Subir Segurança do posto",
        "Descer Segurança do posto",
        "Subir Envasadora",
        "Descer Envasadora",
      ].map((rotulo) => desabilitado(html, rotulo))
    ).toEqual([true, false, false, true]);
  });

  test("trilha sem ninguém não avisa e oferece apagar", () => {
    const t = texto(
      renderToStaticMarkup(
        <EditorDaTrilha cursos={CURSOS} edicao={existente(0, true)} />
      )
    );
    expect(t).not.toContain("esta trilha liberada");
    expect(t).toContain("Apagar a trilha Apagar");
  });
});
