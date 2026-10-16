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

/** O HTML depois da tag que tem `marca`, até o primeiro `fim`. */
const trecho = (h: string, marca: string, fim: string) => {
  const inicio = h.indexOf(marca);
  return inicio < 0
    ? ""
    : h.slice(h.indexOf(">", inicio) + 1, h.indexOf(fim, inicio));
};

/** O nome do link: o texto sem o que é `aria-hidden`. */
const nome = (h: string) =>
  texto(h.replace(/<span aria-hidden="true"[^>]*>[^<]*<\/span>/g, " "));

const itens = (h: string) =>
  [...h.matchAll(/<li[^>]*>(.*?)<\/li>/g)].map(([, li = ""]) => texto(li));

const trilha = (h: string) => texto(trecho(h, "data-trilha", "</ol>"));
const sequencia = (h: string) =>
  texto(trecho(h, "data-sequencia", "</p></div>"));
const primeirasVezes = (h: string) =>
  itens(trecho(h, "Primeiras vezes", "</ol>"));
const certificados = (h: string) =>
  trecho(h, 'aria-labelledby="conquistas-certificados"', "</section>");

const diasDaSemana = (h: string) =>
  [...h.matchAll(/aria-label="([^"]+)" class="[^"]*" data-dia="(\w+)"/g)].map(
    ([, rotulo, estado]) => `${estado} ${rotulo}`
  );

const PILULA_VOCE = /<span class="([^"]*)" data-voce="true" style="([^"]*)"/;

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

describe("a aluna com medalhas", () => {
  const h = html(ALUNA);

  test("o cabeçalho conta as medalhas ganhas entre marcos e certificados", () => {
    expect(texto(h)).toContain("Conquistas 5 medalhas ganhas de 12");
    expect(texto(h)).toContain("Marcos 4 de 7");
    expect(texto(h)).toContain("Certificados 1 de 5 cursos");
  });

  test("a trilha diz onde ela está e quanto falta para a próxima medalha", () => {
    expect(trilha(h)).toBe(
      "49 aulas assistidas. Falta 1 para a medalha de 50. Cada aula assistida até o fim conta para as três medalhas. Você, 49 10 aulas Ganha em 9 de set. 50 aulas Falta 1 aula 100 aulas Faltam 51 aulas"
    );
    expect(h).toContain('style="left:calc(65.83333333333333% - 28px)"');
  });

  test("a sequência são sete dias úteis, com hoje pendente e a frase do próximo passo", () => {
    expect(sequencia(h)).toBe(
      "Sete dias seguidos 3 de 7 dias úteis Ter Qua Qui Hoje Seg Ter Qua Assista uma aula hoje para chegar a 4. Sábado e domingo não quebram."
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

  test("as primeiras vezes, com o fato e o dia de cada uma", () => {
    expect(primeirasVezes(h)).toEqual([
      "Primeira aula Como responder, em Autoavaliação Comercial 18 de ago.",
      "Primeira troca Boas práticas de fabricação, por 200 pts 13 de out.",
      "Primeiro curso concluído Autoavaliação Comercial 2 de set.",
    ]);
    expect(texto(h)).toContain("Primeiras vezes 3 de 3");
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
    expect(primeirasVezes(html(virada))[0]).toContain("18 de ago. de 2026");
  });
});

describe("o aluno novo", () => {
  const h = html(NOVO);

  test("sem medalha, o cabeçalho diz que ainda não há", () => {
    expect(texto(h)).toContain("Conquistas Nenhuma medalha ainda");
    expect(texto(h)).toContain("Marcos 0 de 7");
    expect(texto(h)).toContain("Certificados 0 de 1 curso");
  });

  test("a trilha começa na borda, sem o meio da pílula", () => {
    expect(trilha(h)).toBe(
      "0 aulas assistidas. Faltam 10 para a medalha de 10. Cada aula assistida até o fim conta para as três medalhas. Você, 0 10 aulas Faltam 10 aulas 50 aulas Faltam 50 aulas 100 aulas Faltam 100 aulas"
    );
    const [, classes, estilo] = h.match(PILULA_VOCE) ?? [];
    expect(estilo).toBe("left:calc(0% - 0px)");
    expect(classes).not.toContain("-translate-x-1/2");
  });

  test("sem dia feito, a sequência começa hoje e explica a regra", () => {
    expect(sequencia(h)).toBe(
      "Sete dias seguidos 0 de 7 dias úteis Hoje Seg Ter Qua Qui Sex Seg Uma aula por dia útil, por 7 dias. Sábado e domingo não quebram."
    );
  });

  test("cada primeira vez diz o próximo passo", () => {
    expect(primeirasVezes(h)).toEqual([
      "Primeira aula Comece por Riscos do posto de montagem, em Fábrica e montagem. Por ganhar",
      "Primeira troca Cada aula vale 10 pts; o curso mais barato custa 200 pts. Por ganhar",
      "Primeiro curso concluído Fábrica e montagem tem 7 aulas. Por ganhar",
    ]);
  });

  test("o curso único para em um cartão de 360 px", () => {
    expect(certificados(h)).toContain("@min-[600px]:max-w-[360px]");
  });
});

describe("as frases que mudam com o progresso", () => {
  test("com as três medalhas de aulas, a trilha fecha", () => {
    const ganha = { dia: "2026-10-01", estado: "ganha" };
    const c = comMarco(comMarco(comMarco(ALUNA, 1, ganha), 2, ganha), 3, ganha);
    expect(trilha(html(c))).toStartWith(
      "100 aulas assistidas. As três medalhas de aulas são suas."
    );
  });

  test("continuar a aula começada", () => {
    expect(
      primeirasVezes(
        html(
          comMarco(NOVO, 0, {
            estado: "por_ganhar",
            proxima: { aula: "Aula 2", curso: "Curso", tipo: "continuar" },
          })
        )
      )[0]
    ).toBe("Primeira aula Termine Aula 2, em Curso. Por ganhar");
  });

  test("a sequência com hoje já feito conta o que falta", () => {
    expect(
      sequencia(
        html(
          comMarco(NOVO, 4, {
            dias: 6,
            estado: "por_ganhar",
            hojePendente: false,
            meta: 7,
          })
        )
      )
    ).toEndWith(
      "6 de 7 dias úteis Sex Seg Ter Qua Qui Sex Seg Falta 1 dia útil."
    );
  });

  test("a sequência ganha troca os dias pela medalha e diz quantas vezes", () => {
    const h = html(
      comMarco(NOVO, 4, { dia: "2026-09-25", estado: "ganha", vezes: 3 })
    );
    expect(sequencia(h)).toBe(
      "Sete dias seguidos Ganha em 25 de set. 3 vezes até hoje Uma aula nova em 7 dias úteis seguidos. Sábado e domingo não quebram."
    );
    expect(diasDaSemana(h)).toEqual([]);
    expect(trecho(h, "data-sequencia", "</p></div>")).toContain(
      'data-medalha="ganha"'
    );
  });

  test("a sequência ganha uma vez só não conta as vezes", () => {
    expect(
      sequencia(
        html(
          comMarco(NOVO, 4, { dia: "2026-09-25", estado: "ganha", vezes: 1 })
        )
      )
    ).not.toContain("vezes");
  });

  test("sem curso trocável, a troca não promete preço", () => {
    expect(
      primeirasVezes(
        html(
          comMarco(NOVO, 5, {
            estado: "por_ganhar",
            maisBarato: null,
            pontosPorAula: 10,
          })
        )
      )[1]
    ).toBe(
      "Primeira troca Cada aula vale 10 pts. Nenhum curso novo para trocar agora. Por ganhar"
    );
  });

  test("o curso mais perto, com aula assistida e sem aula faltando", () => {
    const perto = (feitas: number) =>
      primeirasVezes(
        html(
          comMarco(NOVO, 6, {
            estado: "por_ganhar",
            maisPerto: { curso: "Fábrica e montagem", feitas, total: 7 },
          })
        )
      )[2];
    expect(perto(5)).toBe(
      "Primeiro curso concluído Faltam 2 aulas em Fábrica e montagem. Por ganhar"
    );
    expect(perto(7)).toBe(
      "Primeiro curso concluído Só faltam os questionários de Fábrica e montagem. Por ganhar"
    );
  });

  test("sem curso, os certificados dizem onde vão aparecer", () => {
    const h = html({ ...NOVO, certificados: [] });
    expect(texto(h)).toContain(
      "Certificados O certificado de cada curso liberado para você aparece aqui."
    );
  });
});
