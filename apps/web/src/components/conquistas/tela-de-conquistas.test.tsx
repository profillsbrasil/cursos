import { describe, expect, test } from "bun:test";
import type { Conquistas } from "@cursos/api/dominio/conquistas";
import type { DiaISO } from "@cursos/api/dominio/tipos";
import { renderToStaticMarkup } from "react-dom/server";

import { ALUNA, NOVO } from "./exemplo-de-teste";
import { TelaDeConquistas } from "./tela-de-conquistas";

const html = (c: Conquistas) =>
  renderToStaticMarkup(<TelaDeConquistas conquistas={c} />);

const texto = (h: string) =>
  h
    .replace(/<br\/>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** O HTML depois da tag que tem `marca`, até a tag do primeiro `fim`. */
const trecho = (h: string, marca: string, fim: string) => {
  const inicio = h.indexOf(marca);
  return inicio < 0
    ? ""
    : h.slice(
        h.indexOf(">", inicio) + 1,
        h.lastIndexOf("<", h.indexOf(fim, inicio))
      );
};

/** O nome do link: o texto sem o que é `aria-hidden`. */
const nome = (h: string) =>
  texto(h.replace(/<span aria-hidden="true"[^>]*>[^<]*<\/span>/g, " "));

const itens = (h: string) =>
  [...h.matchAll(/<li[^>]*>(.*?)<\/li>/g)].map(([, li = ""]) => texto(li));

const trilha = (h: string) => texto(trecho(h, "data-trilha", "</ol>"));
const sequencia = (h: string) =>
  texto(
    trecho(h, "data-sequencia", "data-ganhas").replace(
      /<li aria-hidden="true"[^>]*>.*?<\/li>/g,
      " | "
    )
  );
/** O cartão Ganhas vai até a grade, ou até o fim de Marcos sem ela. */
const cartaoDasGanhas = (h: string) =>
  trecho(
    h,
    "data-ganhas",
    h.includes('aria-label="Medalhas por ganhar"')
      ? 'aria-label="Medalhas por ganhar"'
      : "</section>"
  );
const ganhas = (h: string) => texto(cartaoDasGanhas(h));
const grade = (h: string) =>
  itens(trecho(h, 'aria-label="Medalhas por ganhar"', "</ol>"));
const cartoesDaGrade = (h: string) =>
  [...h.matchAll(/<li class="([^"]*)"([^>]*data-por-ganhar="(\w+)")/g)].map(
    ([, classes = "", atributos = "", tipo]) => ({
      destaque: atributos.includes("data-destaque"),
      largo: classes.includes("col-span-2"),
      tipo,
    })
  );
const barras = (h: string) =>
  [
    ...trecho(h, 'aria-label="Medalhas por ganhar"', "</ol>").matchAll(
      /<div aria-label="([^"]+)" aria-valuemax="100" aria-valuemin="0" aria-valuenow="(\d+)"/g
    ),
  ].map(([, rotulo, valor]) => `${rotulo} ${valor}`);
const certificados = (h: string) =>
  trecho(h, 'aria-labelledby="conquistas-certificados"', "</section>");

const diasDaSemana = (h: string) =>
  [...h.matchAll(/aria-label="([^"]+)" class="[^"]*" data-dia="(\w+)"/g)].map(
    ([, rotulo, estado]) => `${estado} ${rotulo}`
  );

const MARCA_DO_FIM_DE_SEMANA =
  /<li aria-hidden="true"[^>]*data-fim-de-semana[^>]*>(.*?)<\/li>/;

const MARCOS_SEM_TITULO_A_VISTA =
  /<section aria-labelledby="conquistas-marcos"[^>]*><h2 class="sr-only" id="conquistas-marcos">Marcos<\/h2><div [^>]*data-trilha/;

const PILULA_VOCE = /<b class="([^"]*)" data-voce="true" style="([^"]*)"/;

const comMarco = (
  base: Conquistas,
  i: number,
  medalha: object
): Conquistas => ({
  ...base,
  marcos: base.marcos.map((m, j) =>
    j === i ? ({ ...m, medalha } as (typeof base.marcos)[number]) : m
  ),
});

const comMedalha = (
  base: Conquistas,
  tipo: string,
  medalha: object
): Conquistas => ({
  ...base,
  medalhas: base.medalhas.map((m) =>
    m.tipo === tipo ? ({ ...m, medalha } as (typeof base.medalhas)[number]) : m
  ),
});

const naGrade = (c: Conquistas, medalha: string) =>
  grade(html(c)).find((l) => l.includes(` ${medalha} `));

const PORCENTAGEM_EM_SOL = /class="[^"]*text-sol[^"]*" data-pct/;

describe("a aluna com medalhas", () => {
  const h = html(ALUNA);

  test("o cabeçalho conta as medalhas ganhas entre marcos, grade e certificados", () => {
    expect(texto(h)).toStartWith("Conquistas 6 medalhas ganhas de 19 Marcos");
    expect(texto(h)).toContain("Certificados 1 de 5 cursos");
  });

  test("Marcos é uma região com nome, sem título nem contagem à vista", () => {
    expect(h).toMatch(MARCOS_SEM_TITULO_A_VISTA);
    expect(texto(h)).not.toContain("4 de 7");
  });

  test("a trilha diz onde ela está e quanto falta para a próxima medalha", () => {
    expect(trilha(h)).toBe(
      "49 aulas assistidas. Falta 1 para a medalha de 50. Cada aula assistida até o fim conta para as três medalhas. Você, 49 10 aulas Ganha em 9 de set. 50 aulas 100 aulas Faltam 51 aulas"
    );
    for (const peca of ["data-voce", "data-haste", "data-ponto"]) {
      expect(h).toContain(
        `${peca}="true" style="left:calc(65.83333333333333% - 28px)"`
      );
    }
  });

  test("a marca do fim de semana escreve as siglas como os outros dias", () => {
    const marca = MARCA_DO_FIM_DE_SEMANA.exec(h)?.[1];
    expect(texto(marca ?? "")).toBe("Sáb Dom");
  });

  test("a sequência são sete dias úteis, com hoje pendente e a frase do próximo passo", () => {
    expect(sequencia(h)).toBe(
      "Sete dias seguidos 3 de 7 dias úteis. Assista a uma aula hoje para chegar a 4. Fim de semana não quebra a sequência. Ter Qua Qui Hoje 16 | Seg 19 Ter 20 Qua 21"
    );
    expect(diasDaSemana(h)).toEqual([
      "feito terça, 13 de out.: com aula",
      "feito quarta, 14 de out.: com aula",
      "feito quinta, 15 de out.: com aula",
      "hoje sexta, 16 de out.: hoje, ainda sem aula",
      "por_vir segunda, 19 de out.: por vir",
      "por_vir terça, 20 de out.: por vir",
      "por_vir quarta, 21 de out.: por vir",
    ]);
  });

  test("o cartão Ganhas conta as da grade e mostra cada uma pela data", () => {
    expect(ganhas(h)).toBe(
      "Ganhas 4 de 10 Primeira aula 18 de ago. Primeiro questionário 25 de ago. Primeiro curso concluído 2 de set. Primeira troca 13 de out."
    );
    expect(
      [...trecho(h, "data-ganhas", "</ul>").matchAll(/data-medalha="(\w+)"/g)]
        .length
    ).toBe(4);
  });

  test("a grade tem só as por ganhar, da maior porcentagem para a menor, e o empate pelo nome", () => {
    expect(grade(h)).toEqual([
      "80% Nota cheia Seu melhor de primeira foi 4 de 5. Acerte todas as perguntas de um questionário na primeira tentativa.",
      "58% Mil pontos estudando 580 de 1.000 pts.",
      "50% Da amostra à troca Falta trocar Manutenção básica.",
      "33% Três cursos concluídos Faltam 2 cursos.",
      "33% Três cursos trocados Faltam 2 trocas.",
      "0% Troca até o fim 0 de 3 aulas de Boas práticas de fabricação.",
    ]);
  });

  test("a primeira da grade ocupa duas colunas, com a medalha de 56 px e a porcentagem em Sol", () => {
    const cartoes = cartoesDaGrade(h);
    expect(cartoes.map((c) => [c.tipo, c.destaque, c.largo])).toEqual([
      ["nota_cheia", true, true],
      ["mil_pontos", false, false],
      ["amostra_e_troca", false, false],
      ["tres_cursos", false, false],
      ["tres_trocas", false, false],
      ["troca_ate_o_fim", false, false],
    ]);
    const destaque = trecho(h, "data-destaque", "</li>");
    expect(destaque).toContain("size-14");
    expect(destaque).toMatch(PORCENTAGEM_EM_SOL);
    expect(trecho(h, 'data-por-ganhar="mil_pontos"', "</li>")).toContain(
      "size-10"
    );
  });

  test("a medalha e a porcentagem à vista são aria-hidden, e a barra leva o valor", () => {
    const g = trecho(h, 'aria-label="Medalhas por ganhar"', "</ol>");
    expect([
      ...g.matchAll(/aria-hidden="true"[^>]*data-medalha="por_ganhar"/g),
    ]).toHaveLength(6);
    expect([...g.matchAll(/aria-hidden="true"[^>]*data-pct/g)]).toHaveLength(6);
    expect(barras(h)).toEqual([
      "Nota cheia 80",
      "Mil pontos estudando 58",
      "Da amostra à troca 50",
      "Três cursos concluídos 33",
      "Três cursos trocados 33",
      "Troca até o fim 0",
    ]);
  });

  test("cada certificado é um cartão que leva ao certificado emitido ou ao curso", () => {
    const c = certificados(h);
    expect(
      [...c.matchAll(/<a [^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/g)].map(
        ([, href, corpo = ""]) => `${href} | ${nome(corpo)}`
      )
    ).toEqual([
      "/cursos/autoavaliacao/certificado | Autoavaliação Comercial Emitido em 2 de set. · 2 horas Código PS-M0-2026-3F9A1C Ver certificado",
      "/cursos/comercial | Comercial Vendas 46 de 90 aulas",
      "/cursos/nova-rotina | Nova Rotina de Fechamento Rotinas internas 3 de 9 aulas",
      "/cursos/fabrica | Fábrica e montagem Máquinas 0 de 7 aulas",
      "/cursos/bpf | Boas práticas de fabricação Envase e embalagem 0 de 3 aulas",
    ]);
  });

  test("o lacre: a medalha do emitido, a porcentagem do começado e o tracejado do não começado", () => {
    const lacres = [
      ...certificados(h).matchAll(
        /<span aria-hidden="true" class="[^"]*absolute[^"]*" data-medalha="(\w+)">(.*?)<\/span>/g
      ),
    ].map(([, estado, corpo = ""]) => `${estado} ${texto(corpo)}`.trim());
    expect(lacres).toEqual([
      "ganha",
      "andamento 51%",
      "andamento 33%",
      "por_ganhar",
      "por_ganhar",
    ]);
  });

  test("cinco cursos ficam em 3 colunas, para nenhum cartão sobrar sozinho", () => {
    expect(certificados(h)).toContain('style="--colunas:3"');
  });

  test("a data de outro ano ganha o ano", () => {
    const virada = { ...ALUNA, hoje: "2027-01-05" as DiaISO };
    expect(ganhas(html(virada))).toContain("Primeira aula 18 de ago. de 2026");
  });
});

describe("o aluno novo", () => {
  const h = html(NOVO);

  test("sem medalha, o cabeçalho diz que ainda não há", () => {
    expect(texto(h)).toContain("Conquistas Nenhuma medalha ainda");
    expect(texto(h)).toContain("Certificados 0 de 1 curso");
  });

  test("a trilha começa na borda, sem o meio da pílula", () => {
    expect(trilha(h)).toBe(
      "0 aulas assistidas. Faltam 10 para a medalha de 10. Cada aula assistida até o fim conta para as três medalhas. Você, 0 10 aulas 50 aulas Faltam 50 aulas 100 aulas Faltam 100 aulas"
    );
    const [, classes, estilo] = h.match(PILULA_VOCE) ?? [];
    expect(estilo).toBe("left:calc(0% - 0px)");
    expect(classes).not.toContain("-translate-x-1/2");
    expect(h).toContain('data-ponto="true" style="left:calc(0% - 0px)"');
  });

  test("sem dia feito, a sequência começa hoje e explica a regra", () => {
    expect(sequencia(h)).toBe(
      "Sete dias seguidos Uma aula por dia útil, por 7 dias. Fim de semana não quebra a sequência. Hoje 16 | Seg 19 Ter 20 Qua 21 Qui 22 Sex 23 | Seg 26"
    );
  });

  test("sem nenhuma ganha, o cartão Ganhas diz o que fazer para a primeira", () => {
    expect(ganhas(h)).toBe(
      "Ganhas 0 de 10 Sua primeira medalha vem com uma aula assistida até o fim. Comece por Riscos do posto de montagem, em Fábrica e montagem."
    );
    expect(cartaoDasGanhas(h)).not.toContain("data-medalha");
  });

  test("tudo em 0%, a grade vai pelo nome, e cada cartão diz o que falta", () => {
    expect(grade(h)).toEqual([
      "0% Da amostra à troca Faltam 2 passos: ver uma amostra e trocar o curso. A amostra é a primeira aula de um curso que você ainda não tem.",
      "0% Mil pontos estudando 0 de 1.000 pts.",
      "0% Nota cheia Acerte todas as perguntas na primeira tentativa.",
      "0% Primeira aula Comece por Riscos do posto de montagem, em Fábrica e montagem.",
      "0% Primeira troca O curso mais barato custa 200 pts.",
      "0% Primeiro curso concluído Fábrica e montagem tem 7 aulas.",
      "0% Primeiro questionário Seja aprovado no questionário de uma aula.",
      "0% Três cursos concluídos Faltam 3 cursos.",
      "0% Três cursos trocados Faltam 3 trocas.",
      "0% Troca até o fim Troque um curso e conclua-o.",
    ]);
  });

  test("o curso único para em um cartão de 360 px", () => {
    expect(certificados(h)).toContain("@min-[600px]:max-w-[360px]");
  });
});

describe("as frases que mudam com o progresso", () => {
  test("com as três medalhas de aulas, a trilha fecha", () => {
    const ganha = { dia: "2026-10-01", estado: "ganha" };
    const c = comMarco(comMarco(comMarco(ALUNA, 0, ganha), 1, ganha), 2, ganha);
    expect(trilha(html(c))).toStartWith(
      "100 aulas assistidas. As três medalhas de aulas são suas."
    );
  });

  test("continuar a aula começada", () => {
    expect(
      naGrade(
        comMedalha(NOVO, "primeira_aula", {
          estado: "por_ganhar",
          pct: 0,
          proxima: { aula: "Aula 2", curso: "Curso", tipo: "continuar" },
        }),
        "Primeira aula"
      )
    ).toBe("0% Primeira aula Termine Aula 2, em Curso.");
  });

  test("com as dez ganhas, a grade some e o cartão Ganhas mostra as dez", () => {
    const todas: Conquistas = {
      ...ALUNA,
      medalhas: ALUNA.medalhas.map(
        (m) =>
          ({
            ...m,
            medalha: { dia: "2026-10-01", estado: "ganha" },
          }) as (typeof ALUNA.medalhas)[number]
      ),
    };
    const h = html(todas);
    expect(ganhas(h)).toStartWith("Ganhas 10 de 10");
    expect(h).not.toContain('aria-label="Medalhas por ganhar"');
  });

  test("a sequência com hoje já feito conta o que falta", () => {
    expect(
      sequencia(
        html(
          comMarco(NOVO, 3, {
            dias: 6,
            estado: "por_ganhar",
            hojePendente: false,
            meta: 7,
          })
        )
      )
    ).toEndWith(
      "6 de 7 dias úteis. Falta 1 dia útil. Sex | Seg Ter Qua Qui Sex | Seg 19"
    );
  });

  test("a sequência ganha troca os dias pela medalha e diz quantas vezes", () => {
    const h = html(
      comMarco(NOVO, 3, { dia: "2026-09-25", estado: "ganha", vezes: 3 })
    );
    expect(sequencia(h)).toBe(
      "Sete dias seguidos Uma aula nova em 7 dias úteis seguidos. Fim de semana não quebra a sequência. Ganha em 25 de set. 3 vezes até hoje"
    );
    expect(diasDaSemana(h)).toEqual([]);
    expect(trecho(h, "data-sequencia", "data-ganhas")).toContain(
      'data-medalha="ganha"'
    );
  });

  test("a sequência ganha uma vez só não conta as vezes", () => {
    expect(
      sequencia(
        html(
          comMarco(NOVO, 3, { dia: "2026-09-25", estado: "ganha", vezes: 1 })
        )
      )
    ).not.toContain("vezes");
  });

  test("sem curso, os certificados dizem onde vão aparecer", () => {
    const h = html({ ...NOVO, certificados: [] });
    expect(texto(h)).toContain(
      "Certificados O certificado de cada curso liberado para você aparece aqui."
    );
  });
});
