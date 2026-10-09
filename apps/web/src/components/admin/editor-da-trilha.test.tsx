import { describe, expect, mock, test } from "bun:test";
import type { CursoNaVisao } from "@cursos/api/dominio/catalogo";
import {
  type EdicaoDaTrilha,
  edicaoDeTrilhaNova,
  TRILHA_EM_USO,
} from "@cursos/api/dominio/edicao-da-trilha";
import type { CursoId, TrilhaId, Versao } from "@cursos/api/dominio/tipos";
import { renderToStaticMarkup } from "react-dom/server";

// Fora do App Router o useRouter lança; o resto do módulo fica o de verdade.
const navegacao = await import("next/navigation");
mock.module("next/navigation", () => ({
  ...navegacao,
  useRouter: () => ({
    push: () => undefined,
    refresh: () => undefined,
    replace: () => undefined,
  }),
}));

const { ApagarTrilha, AvisoDePerda, EditorDaTrilha, resumoDasPerdas } =
  await import("./editor-da-trilha");
const { CursosDaTrilha } = await import("./cursos-da-trilha");

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

describe("apagar a trilha", () => {
  // Depois do primeiro salvar a tela deixa de ser "nova", mas a edição ainda é
  // a do rascunho até o refresh chegar.
  test("a trilha recém-criada oferece apagar, sem a frase de trilha em uso", () => {
    const t = texto(
      renderToStaticMarkup(<ApagarTrilha edicao={edicaoDeTrilhaNova(TRILHA)} />)
    );
    expect(t).not.toContain(TRILHA_EM_USO);
    expect(t).toContain("Apagar a trilha Apagar");
  });
});

/** Com alunos, a trilha tem liberações e não se apaga. */
const existente = (alunos: number): EdicaoDaTrilha => ({
  documento: {
    cursos: ["c1" as CursoId, "c2" as CursoId],
    descricao: "Do posto à máquina.",
    id: TRILHA,
    slug: "operador",
    titulo: "Operador",
    versao: "v1" as Versao,
  },
  uso: {
    alunosComATrilha: alunos,
    comecaramSoPelaTrilha: [],
    conclusoes: 0,
    liberacoes: alunos,
  },
});

describe("editor da trilha", () => {
  test("trilha nova abre vazia, como rascunho e sem a parte de apagar", () => {
    const html = renderToStaticMarkup(
      <EditorDaTrilha cursos={CURSOS} edicao={edicaoDeTrilhaNova(TRILHA)} />
    );
    const t = texto(html);
    expect(t).toContain("Nova trilha");
    expect(t).toContain("0 cursos");
    expect(t).toContain("Nenhum curso ainda.");
    expect(t).toContain("Rascunho. Os alunos não veem nada até você salvar.");
    expect(t).not.toContain("Apagar a trilha");
  });

  test("título, endereço e descrição se anunciam obrigatórios, como o schema exige", () => {
    const html = renderToStaticMarkup(
      <EditorDaTrilha cursos={CURSOS} edicao={edicaoDeTrilhaNova(TRILHA)} />
    );
    const campo = (id: string) =>
      html.match(new RegExp(`<(input|textarea)[^>]*id="${id}"[^>]*>`))?.[0] ??
      "";
    expect(
      ["trilha-titulo", "trilha-slug", "trilha-descricao"].map((id) =>
        campo(id).includes('required=""')
      )
    ).toEqual([true, true, true]);
  });

  test("trilha liberada mostra os cursos em ordem e a frase da recusa de apagar", () => {
    const html = renderToStaticMarkup(
      <EditorDaTrilha cursos={CURSOS} edicao={existente(3)} />
    );
    const t = texto(html);
    expect(t).toContain("1 1º: Segurança do posto");
    expect(t).toContain("2 2º: Envasadora Em produção");
    expect(t).toContain(TRILHA_EM_USO);
    expect(t).toContain("Tudo salvo.");
    expect(t).not.toContain("esta trilha liberada");
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
        <EditorDaTrilha cursos={CURSOS} edicao={existente(0)} />
      )
    );
    expect(t).not.toContain("esta trilha liberada");
    expect(t).toContain("Apagar a trilha Apagar");
  });
});

describe("aviso de quem tem a trilha", () => {
  const SPAN = /<\/?span[^>]*>/g;
  const aviso = (props: Parameters<typeof AvisoDePerda>[0]) =>
    texto(
      renderToStaticMarkup(<AvisoDePerda {...props} />).replace(SPAN, "")
    ).trim();
  const ENVASADORA = {
    cursoId: "c2" as CursoId,
    pessoas: 2,
    titulo: "Envasadora",
  };
  const SEGURANCA = {
    cursoId: "c1" as CursoId,
    pessoas: 0,
    titulo: "Segurança do posto",
  };

  test("sem mudança no rascunho, ou sem ninguém com a trilha, não aparece", () => {
    expect(aviso({ alunos: 3, perdas: [ENVASADORA], sujo: false })).toBe("");
    expect(aviso({ alunos: 0, perdas: [ENVASADORA], sujo: true })).toBe("");
  });

  test("inserir e reordenar mantêm a frase de hoje: curso começado continua aberto", () => {
    expect(aviso({ alunos: 3, perdas: [], sujo: true })).toBe(
      "3 pessoas têm esta trilha liberada, e a mudança vale na hora. Curso que alguém já começou continua aberto."
    );
  });

  test("curso tirado: a barra fica numa frase só, sem a lista por curso", () => {
    const um = aviso({ alunos: 3, perdas: [ENVASADORA], sujo: true });
    expect(um).toBe(
      "1 curso sai da trilha ao salvar: 2 pessoas que começaram perdem o acesso."
    );
    const muitos = aviso({
      alunos: 3,
      perdas: Array.from({ length: 12 }, (_, i) => ({
        ...SEGURANCA,
        cursoId: `c${i}` as CursoId,
        pessoas: i < 2 ? 4 : 0,
      })),
      sujo: true,
    });
    expect(muitos).toBe(
      "12 cursos saem da trilha ao salvar. Em 2 deles, quem começou perde o acesso."
    );
    expect(
      renderToStaticMarkup(
        <AvisoDePerda alunos={3} perdas={[ENVASADORA, SEGURANCA]} sujo />
      )
    ).not.toContain("<li");
  });

  test("o resumo não soma pessoas de cursos diferentes, nem afirma zero sem número", () => {
    expect(resumoDasPerdas([SEGURANCA])).toBe(
      "1 curso sai da trilha ao salvar. Ninguém tinha começado."
    );
    expect(resumoDasPerdas([{ ...SEGURANCA, pessoas: null }])).toBe(
      "1 curso sai da trilha ao salvar, e quem só tinha a trilha perde o acesso."
    );
    expect(resumoDasPerdas([{ ...ENVASADORA, pessoas: 1 }])).toBe(
      "1 curso sai da trilha ao salvar: 1 pessoa que começou perde o acesso."
    );
    expect(
      resumoDasPerdas([SEGURANCA, { ...SEGURANCA, cursoId: "c9" as CursoId }])
    ).toBe("2 cursos saem da trilha ao salvar. Ninguém tinha começado.");
    expect(resumoDasPerdas([SEGURANCA, { ...ENVASADORA, pessoas: null }])).toBe(
      "2 cursos saem da trilha ao salvar, e quem só tinha a trilha perde o acesso."
    );
  });
});

describe("linha riscada na lista", () => {
  const nada = () => undefined;
  const lista = (alunos: number, pessoas: number | null) => {
    const html = renderToStaticMarkup(
      <CursosDaTrilha
        alunos={alunos}
        catalogo={CURSOS}
        mudar={nada}
        perdas={[
          { cursoId: "c1" as CursoId, pessoas, titulo: "Segurança do posto" },
        ]}
        rascunho={{
          descricao: "",
          lista: [
            { id: "c1" as CursoId, tirado: true },
            { id: "c2" as CursoId, tirado: false },
          ],
          slug: "",
          titulo: "",
        }}
        salvo={["c1" as CursoId, "c2" as CursoId]}
        trilhaId={TRILHA}
      />
    );
    return { html, t: texto(html) };
  };

  test("o curso tirado fica no lugar dele, riscado, com o número e o Desfazer", () => {
    const { html, t } = lista(3, 2);
    expect(t).toContain(
      "Tirado: Segurança do posto Ao salvar, quem só tinha a trilha perde o curso. 2 pessoas já tinham começado."
    );
    expect(t.indexOf("Segurança do posto")).toBeLessThan(
      t.indexOf("Envasadora")
    );
    expect(t).toContain("1 1º: Envasadora");
    expect(html).toContain("line-through");
    expect(
      desabilitado(html, "Desfazer: devolver Segurança do posto à trilha")
    ).toBe(false);
  });

  test("sem número, a linha diz só que quem tinha a trilha perde o curso", () => {
    const { t } = lista(3, null);
    expect(t).toContain(
      "Segurança do posto Ao salvar, quem só tinha a trilha perde o curso. Desfazer"
    );
    expect(t).not.toContain("começado");
  });

  test("sem ninguém com a trilha, a linha só diz que o curso sai", () => {
    expect(lista(0, 0).t).toContain(
      "Segurança do posto Sai da trilha ao salvar."
    );
  });
});
