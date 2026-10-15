import { describe, expect, test } from "bun:test";
import {
  cursoLinha,
  exemploDoPrototipo,
  SEM_LIBERACAO,
} from "@cursos/api/dominio/exemplo";
import { montarPainel, type ResumoAluno } from "@cursos/api/dominio/painel";
import { renderToStaticMarkup } from "react-dom/server";

import { ConteudoMeusCursos } from "./conteudo";

const RESUMO: ResumoAluno = {
  bonus: 30,
  dias: [],
  faltamParaBonus: 7,
  pontosSemana: 0,
  saldo: 0,
  sequenciaDias: 0,
};

const texto = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Títulos de seção e de curso, na ordem do HTML, a partir da primeira trilha. */
function titulos(html: string, primeiro: string) {
  const todos = [...html.matchAll(/<h[23][^>]*>(.*?)<\/h[23]>/g)].map((m) =>
    texto(m[1] ?? "")
  );
  return todos.slice(todos.indexOf(primeiro));
}

/** Texto de cada item das listas numeradas, na ordem. */
const itensNumerados = (html: string) =>
  [...html.matchAll(/<ol[^>]*>(.*?)<\/ol>/g)].map((ol) =>
    [...(ol[1] ?? "").matchAll(/<li[^>]*>(.*?)<\/li>/g)].map((li) =>
      texto(li[1] ?? "")
    )
  );

/** O texto que o leitor de tela lê: sem o que tem aria-hidden="true". */
const legivel = (html: string) =>
  texto(html.replace(/<(\w+)[^>]*aria-hidden="true"[^>]*>.*?<\/\1>/g, " "));

/** O HTML de dentro da seção da trilha, pelo slug. */
const secaoDaTrilha = (html: string, slug: string) =>
  html.match(
    new RegExp(`<section aria-labelledby="trilha-${slug}">(.*?)</section>`)
  )?.[1] ?? "";

const hrefs = (html: string) =>
  [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);

const render = (painel: ReturnType<typeof montarPainel>) =>
  renderToStaticMarkup(
    <ConteudoMeusCursos conta={null} painel={painel} resumo={RESUMO} />
  );

describe("Meus cursos com o caso do protótipo", () => {
  const html = render(montarPainel(exemploDoPrototipo()));

  test("cada trilha vem com as capas logo abaixo, e os cursos rápidos no fim", () => {
    expect(titulos(html, "Formação comercial")).toEqual([
      "Formação comercial",
      "Profills School Comercial",
      "Fábrica e montagem",
      "Segurança do posto",
      "Envasadora: conhecendo a máquina",
      "Montagem pneumática",
      "Cursos rápidos",
      "Nova Rotina de Fechamento",
      "Gravação de Máquinas",
      "Autoavaliação Comercial",
      "Exemplo: Módulo 13 atualizado com o novo cadastro de atendimentos do CRM",
    ]);
  });

  test("as capas de cada trilha são uma lista numerada na ordem da trilha", () => {
    const [comercial, fabrica, ...resto] = itensNumerados(html);
    expect(resto).toEqual([]);
    expect(comercial).toHaveLength(1);
    expect(comercial?.[0]).toContain("1 Profills School Comercial");
    expect(fabrica).toHaveLength(3);
    expect(fabrica?.[0]).toContain("1 Segurança do posto");
    expect(fabrica?.[1]).toContain("2 Envasadora: conhecendo a máquina");
    expect(fabrica?.[2]).toContain("3 Montagem pneumática");
  });

  test('o curso em produção diz "Em produção", nunca "Em breve"', () => {
    expect(html).not.toContain("Em breve");
    expect(html).not.toContain("· em produção");
    expect(html.split("Em produção").length - 1).toBe(2);
  });

  test("o leitor de tela ouve a lista e o número de cada capa", () => {
    const listas = [...html.matchAll(/<ol([^>]*)>(.*?)<\/ol>/g)];
    expect(listas).toHaveLength(2);
    for (const [, atributos] of listas) {
      // O WebKit tira o papel de lista do `ol` com list-style: none sem role="list".
      expect(atributos).toContain('role="list"');
    }
    const fabrica = legivel(listas[1]?.[2] ?? "");
    expect(fabrica).toContain("1 Segurança do posto");
    expect(fabrica).toContain("2 Envasadora: conhecendo a máquina");
    expect(fabrica).toContain("3 Montagem pneumática");
  });

  test("cada curso da trilha é um link só", () => {
    for (const slug of ["formacao-comercial", "fabrica-montagem"]) {
      const links = hrefs(secaoDaTrilha(html, slug));
      expect(links.length).toBeGreaterThan(0);
      expect(new Set(links).size).toBe(links.length);
    }
  });

  test("a trilha de um curso não repete o curso no resumo", () => {
    // A descrição da trilha também cita o curso; a conta começa depois dela.
    const comercial = texto(secaoDaTrilha(html, "formacao-comercial"))
      .split("em 16 módulos e três níveis.")
      .at(-1);
    expect(comercial).not.toContain("Agora:");
    expect(comercial?.split("Profills School Comercial").length).toBe(2);
  });
});

describe("Meus cursos com trilha sem curso", () => {
  const a = cursoLinha("a", { aulas: [2] });
  const trilha = (
    slug: string,
    cursos: { curso: typeof a; posicao: number }[]
  ) => ({
    curso: null,
    liberadaEm: new Date("2026-08-01T00:00:00Z"),
    trilha: {
      cursos,
      descricao: "Descrição",
      id: slug,
      slug,
      titulo: `Trilha ${slug}`,
    },
  });

  test("a trilha esvaziada pelo admin some da tela e da contagem", () => {
    const html = render(
      montarPainel({
        ...SEM_LIBERACAO,
        liberacoes: [
          trilha("vazia", []),
          trilha("cheia", [{ curso: a, posicao: 1 }]),
        ],
      })
    );
    expect(html).not.toContain("Trilha vazia");
    expect(html).toContain("Trilha cheia");
    expect(texto(html)).toContain("1 trilha liberada para você");
  });

  test("só com trilha vazia, a tela é a do painel vazio", () => {
    const html = render(
      montarPainel({ ...SEM_LIBERACAO, liberacoes: [trilha("vazia", [])] })
    );
    expect(html).not.toContain("Trilha vazia");
    expect(html).not.toContain("liberada para você");
  });
});

describe("Meus cursos com curso que ainda não abre", () => {
  const a = cursoLinha("a", { aulas: [2] });
  const b = cursoLinha("b", { aulas: [2] });
  const html = render(
    montarPainel({
      ...SEM_LIBERACAO,
      liberacoes: [
        {
          curso: null,
          liberadaEm: new Date("2026-08-01T00:00:00Z"),
          trilha: {
            cursos: [
              { curso: a, posicao: 1 },
              { curso: b, posicao: 2 },
            ],
            descricao: "Descrição",
            id: "t",
            slug: "t",
            titulo: "Trilha t",
          },
        },
      ],
    })
  );

  test("diz qual curso precisa ser concluído antes", () => {
    const [trilha] = itensNumerados(html);
    expect(trilha?.[1]).toContain("2 Curso b");
    expect(trilha?.[1]).toContain("Abre depois de Curso a");
    expect(trilha?.[0]).not.toContain("Abre depois");
  });
});
