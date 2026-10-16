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

import { FaixaComunicado } from "./aviso-comunicado";
import { ConteudoMeusCursos } from "./conteudo";

const NBSP = " ";
const INICIO_DA_CAPA = /<a |<div aria-disabled/;

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

/** O HTML de dentro da seção, pelo id do título. */
const secaoDe = (html: string, id: string) =>
  html.match(
    new RegExp(`<section aria-labelledby="${id}">(.*?)</section>`)
  )?.[1] ?? "";

/** Títulos de seção e de curso, na ordem do HTML, a partir de `primeiro`. */
function titulos(html: string, primeiro: string) {
  const todos = [...html.matchAll(/<h[23][^>]*>(.*?)<\/h[23]>/g)].map((m) =>
    texto(m[1] ?? "")
  );
  return todos.slice(todos.indexOf(primeiro));
}

/** O texto de cada capa da seção dos cursos, na ordem. */
const capas = (html: string) =>
  secaoDe(html, "cursos").split(INICIO_DA_CAPA).slice(1).map(texto);

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

  test("os cursos vêm numa seção só, na ordem do painel", () => {
    expect(titulos(html, "Cursos")).toEqual([
      "Cursos",
      "Profills School Comercial",
      "Nova Rotina de Fechamento",
      "Fábrica e montagem",
      "Gravação de Máquinas",
      "Autoavaliação Comercial",
    ]);
    expect(texto(html)).toContain("5 cursos liberados para você");
    expect(html).not.toContain("Cursos rápidos");
  });

  test("a seção dos cursos não repete o cabeçalho da página", () => {
    expect(texto(html).match(/liberados para você/gi)).toEqual([
      "liberados para você",
    ]);
  });

  test("cada curso é um link só, para a página dele, e o curso em produção não abre", () => {
    const links = hrefs(secaoDe(html, "cursos"));
    expect(links).toEqual([
      "/cursos/comercial",
      "/cursos/nova-rotina",
      "/cursos/fabrica-montagem",
      "/cursos/autoavaliacao",
    ]);
  });

  test("a linha sob a capa descreve o curso inteiro", () => {
    const [comercial, novaRotina, fabrica, gravacao, autoavaliacao] =
      capas(html);
    expect(comercial).toContain("Vendas e negócios · 46 de 90 aulas");
    expect(comercial).toContain("Agora: Módulo 8, Pilar Urgência");
    expect(comercial).not.toContain("Autoavaliação comercial");
    expect(novaRotina).toContain(
      "Vendas e negócios · POP-COM-001 · 3 de 9 aulas"
    );
    expect(fabrica).toContain("Produção e montagem · 7 aulas · 1 h 14 min");
    expect(fabrica).not.toContain("Agora:");
    expect(gravacao).toContain("Produtos e aplicações · Regra 5x4");
    expect(gravacao).not.toContain("aulas");
    expect(autoavaliacao).toContain(
      "Vendas e negócios · 30 afirmações · 6 competências · 2 de 2 aulas"
    );
  });

  test("a capa leva a etiqueta com as aulas e a duração do curso, como no protótipo", () => {
    const [comercial, novaRotina, fabrica, gravacao] = capas(html);
    // A etiqueta vem antes do título; a linha sob a capa, depois.
    expect(comercial?.split("Profills School Comercial")[0]).toContain(
      "90 aulas · 15 h 51 min"
    );
    expect(fabrica?.split("Fábrica e montagem")[0]).toContain(
      "7 aulas · 1 h 14 min"
    );
    expect(novaRotina?.split("Nova Rotina de Fechamento")[0]).toContain(
      "9 aulas · 1 h 35 min"
    );
    expect(gravacao?.split("Gravação de Máquinas")[0]).toContain("Em produção");
    expect(html).not.toContain("Comece por aqui");
  });

  test("o separador da linha nunca fica sozinho na ponta da linha", () => {
    // Espaço que não quebra dos dois lados do "·" que junta as partes: a quebra
    // cai dentro de uma parte, e o "·" nunca abre nem fecha uma linha.
    const N = NBSP;
    expect(html).toContain(
      `Vendas e negócios${N}·${N}30 afirmações · 6 competências${N}·${N}2${N}de${N}2${N}aulas`
    );
    expect(html).toContain(`Produção e montagem${N}·${N}7${N}aulas`);
  });

  test("o tamanho do curso não quebra no meio quando a linha passa da largura", () => {
    // Em 390 px, "30 afirmações · 6 competências" empurra o tamanho para a quebra.
    const N = NBSP;
    expect(html).toContain(`2${N}de${N}2${N}aulas`);
    expect(html).toContain(`7${N}aulas${N}·${N}1${N}h${N}14${N}min`);
  });
});

describe("Meus cursos com curso em produção que tem código", () => {
  const curso = cursoLinha("c", { aulas: [2], status: "em_producao" });
  const html = render(
    montar({
      ...SEM_LIBERACAO,
      liberacoes: [
        {
          curso: { ...curso, codigo: "POP-FAB-002" },
          liberadaEm: new Date("2026-08-01T00:00:00Z"),
        },
      ],
    })
  );

  test('a capa diz "Em produção", nunca "Em breve", e a linha mostra o tema e o código, sem o tamanho', () => {
    const cursos = texto(secaoDe(html, "cursos"));
    expect(cursos).toContain("Em produção");
    expect(cursos).toContain("Tema · POP-FAB-002");
    expect(cursos).not.toContain("aulas");
    expect(html).not.toContain("Em breve");
    expect(texto(html)).toContain("1 curso liberado para você");
  });

  test("o curso em produção não é link", () => {
    expect(hrefs(secaoDe(html, "cursos"))).toEqual([]);
  });
});

describe("Meus cursos sem liberação", () => {
  test("a tela é a do painel vazio", () => {
    const html = render(montar(SEM_LIBERACAO));
    expect(texto(html)).toContain("Nenhum curso liberado ainda");
    expect(html).not.toContain("liberado para você");
  });
});

const CLASSES_DO_DETAILS = /<details class="([^"]*)"/;
const H2 = /<h2[^>]*>(.*?)<\/h2>/g;
const DATA_DA_FAIXA = /<time[^>]*>(.*?)<\/time>/;

describe("o comunicado em Meus cursos", () => {
  // O comunicado do exemplo saiu em 2 de outubro.
  const TITULO =
    "Exemplo: Módulo 13 atualizado com o novo cadastro de atendimentos do CRM";
  const onde = (html: string) => ({
    banner: html.indexOf("Cronograma reverso"),
    comunicado: html.indexOf(TITULO),
    cursos: html.indexOf('aria-labelledby="cursos"'),
    semana: html.indexOf("Sua semana"),
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
    expect(p.semana).toBeLessThan(p.cursos);
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

  test("com 14 dias ou mais, fica no fim, depois dos cursos", () => {
    const html = render(montar(exemploDoPrototipo(), "2026-10-16" as DiaISO));
    const p = onde(html);
    expect(p.comunicado).toBeGreaterThan(p.cursos);
    expect(html.split(TITULO).length - 1).toBe(1);
    expect(texto(html)).toContain("Publicado em 2 de outubro de 2026.");
  });

  // O resumo da faixa usa o curto do resto do app: o dia de São Paulo, com o
  // ano quando ele não é o de hoje. Aberta, a faixa mostra a data longa.
  test("na virada do ano, a data da faixa leva o ano, no dia de São Paulo", () => {
    const html = renderToStaticMarkup(
      <FaixaComunicado
        comunicado={{
          hoje: "2026-01-05" as DiaISO,
          id: "comunicado-da-virada",
          lugar: "topo",
          publicadoEm: "2025-12-29T02:00:00.000Z",
          texto: "O cadastro de atendimentos mudou.",
          titulo: "Módulo 13 atualizado",
        }}
      />
    );
    expect(html.match(DATA_DA_FAIXA)?.[1]).toBe("28 de dez. de 2025");
    expect(texto(html)).toContain("Publicado em 28 de dezembro de 2025.");
  });
});

const CLASSES_DA_IMAGEM = /<img[^>]*class="([^"]*object-cover[^"]*)"/g;

describe("a capa sob o cursor", () => {
  test("a imagem cresce em 200 ms com a curva ease-forte, sem transição com movimento reduzido", () => {
    const html = render(montar(exemploDoPrototipo()));
    const abertas = [...html.matchAll(CLASSES_DA_IMAGEM)]
      .map((m) => m[1].split(" "))
      .filter((c) => c.includes("group-hover:scale-[1.03]"));
    expect(abertas.length).toBeGreaterThan(0);
    for (const classes of abertas) {
      expect(classes).toEqual(
        expect.arrayContaining([
          "transition-transform",
          "duration-200",
          "ease-forte",
          "motion-reduce:transition-none",
        ])
      );
      expect(classes).not.toContain("ease-out");
      expect(classes).not.toContain("duration-300");
    }
  });
});
