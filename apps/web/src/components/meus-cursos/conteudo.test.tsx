import { describe, expect, test } from "bun:test";
import {
  cursoLinha,
  exemploDoPrototipo,
  HOJE_DO_EXEMPLO,
  SEM_LIBERACAO,
} from "@cursos/api/dominio/exemplo";
import {
  type LinhasPainel,
  montarPainel,
  type ResumoAluno,
} from "@cursos/api/dominio/painel";
import type { DiaISO } from "@cursos/api/dominio/tipos";
import { renderToStaticMarkup } from "react-dom/server";

import { ConteudoMeusCursos } from "./conteudo";

const montar = (l: LinhasPainel, hoje: DiaISO = HOJE_DO_EXEMPLO) =>
  montarPainel(l, hoje);

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

/** O HTML de dentro da seção, pelo id do título. */
const secaoDe = (html: string, id: string) =>
  html.match(
    new RegExp(`<section aria-labelledby="${id}">(.*?)</section>`)
  )?.[1] ?? "";

/** O HTML de dentro da seção da trilha, pelo slug. */
const secaoDaTrilha = (html: string, slug: string) =>
  secaoDe(html, `trilha-${slug}`);

const hrefs = (html: string) =>
  [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);

const render = (painel: ReturnType<typeof montarPainel>) =>
  renderToStaticMarkup(
    <ConteudoMeusCursos
      conta={null}
      painel={painel}
      resumo={RESUMO}
      temCursoTrocavelNaVitrine={false}
    />
  );

describe("Meus cursos com o caso do protótipo", () => {
  const html = render(montar(exemploDoPrototipo()));

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

  test("a linha sob a capa descreve o curso inteiro, igual na trilha e nos cursos rápidos", () => {
    const [comercial, fabrica] = itensNumerados(html);
    const [seguranca, envasadora] = fabrica ?? [];
    expect(comercial?.[0]).toContain("Vendas e negócios · 46 de 90 aulas");
    expect(comercial?.[0]).toContain("Agora: módulo 8, Pilar Urgência");
    expect(comercial?.[0]).not.toContain("Autoavaliação comercial");
    expect(comercial?.[0]).not.toContain("21 min");

    expect(seguranca).toContain("Fábrica e montagem · 3 aulas · 32 min");
    expect(seguranca).not.toContain("Segurança da máquina");
    expect(seguranca).not.toContain("Agora:");
    // Em produção, o conteúdo ainda não fechou: a linha diz só o tema.
    expect(envasadora).toContain("Fábrica e montagem");
    expect(envasadora).not.toContain("aulas");
    expect(envasadora).not.toContain("Envasadora ·");

    const rapidos = texto(secaoDe(html, "cursos-rapidos"));
    expect(rapidos).toContain("Vendas e negócios · POP-COM-001 · 3 de 9 aulas");
    expect(rapidos).toContain(
      "Produtos e aplicações · Regra 5x4 · 3 aulas · 32 min"
    );
    expect(rapidos).toContain(
      "Vendas e negócios · 30 afirmações · 6 competências · 2 de 2 aulas"
    );
  });

  test("a etiqueta da capa não repete as aulas e a duração da linha", () => {
    expect(html).not.toContain("15 h 51 min");
    expect(html).not.toContain("1 h 35 min");
  });

  test("a trilha de um curso não repete o curso no resumo", () => {
    // A descrição da trilha também cita o curso; a conta começa depois dela.
    const comercial = texto(secaoDaTrilha(html, "formacao-comercial"))
      .split("em 16 módulos e três níveis.")
      .at(-1);
    const resumo = comercial?.split("1 Profills School Comercial")[0];
    expect(resumo).not.toContain("Agora:");
    expect(comercial?.split("Profills School Comercial").length).toBe(2);
  });
});

const CLASSES_DO_DETAILS = /<details class="([^"]*)"/;
const H2 = /<h2[^>]*>(.*?)<\/h2>/g;

describe("o comunicado em Meus cursos", () => {
  // O comunicado do exemplo saiu em 2 de outubro.
  const TITULO =
    "Exemplo: Módulo 13 atualizado com o novo cadastro de atendimentos do CRM";
  const onde = (html: string) => ({
    banner: html.indexOf("Cronograma reverso"),
    comunicado: html.indexOf(TITULO),
    rapidos: html.indexOf("Cursos rápidos"),
    semana: html.indexOf("Sua semana"),
    trilha: html.indexOf('aria-labelledby="trilha-'),
  });

  // Em uma coluna (abaixo de 1181 px) a ordem do HTML é a da tela: a faixa vem
  // logo depois do banner, antes de Sua semana, para aparecer mais cedo. Em
  // duas colunas ela desce para a linha de baixo, sob o banner e Sua semana.
  test("com menos de 14 dias, é uma faixa entre o banner e Sua semana", () => {
    const html = render(montar(exemploDoPrototipo(), "2026-10-15" as DiaISO));
    const p = onde(html);
    expect(p.banner).toBeGreaterThan(-1);
    expect(p.comunicado).toBeGreaterThan(p.banner);
    expect(p.comunicado).toBeLessThan(p.semana);
    expect(p.semana).toBeLessThan(p.trilha);
    const faixa = html.match(CLASSES_DO_DETAILS)?.[1] ?? "";
    expect(faixa.split(" ")).toEqual(
      expect.arrayContaining([
        "min-[1181px]:col-span-2",
        "min-[1181px]:row-start-2",
      ])
    );
    expect(html.split(TITULO).length - 1).toBe(1);
    expect(texto(html)).toContain("2 de out.");
  });

  test("na faixa, o título é um h2, para quem navega por títulos", () => {
    const html = render(montar(exemploDoPrototipo(), "2026-10-15" as DiaISO));
    const h2s = [...html.matchAll(H2)].map((m) => texto(m[1] ?? ""));
    expect(h2s).toContain(`Comunicado: ${TITULO}`);
  });

  test("com 14 dias ou mais, fica no fim, depois dos cursos rápidos", () => {
    const html = render(montar(exemploDoPrototipo(), "2026-10-16" as DiaISO));
    const p = onde(html);
    expect(p.comunicado).toBeGreaterThan(p.rapidos);
    expect(html.split(TITULO).length - 1).toBe(1);
    expect(texto(html)).toContain("Publicado em 2 de outubro de 2026.");
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
      montar({
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
      montar({ ...SEM_LIBERACAO, liberacoes: [trilha("vazia", [])] })
    );
    expect(html).not.toContain("Trilha vazia");
    expect(html).not.toContain("liberada para você");
  });
});

describe("Meus cursos com curso que ainda não abre", () => {
  const a = cursoLinha("a", { aulas: [2] });
  const b = cursoLinha("b", { aulas: [2] });
  const html = render(
    montar({
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
