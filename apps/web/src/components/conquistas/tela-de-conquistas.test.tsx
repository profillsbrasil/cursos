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
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** O texto de cada linha de uma lista, pelo id do título da seção. */
const linhas = (h: string, secao: string) => {
  const inicio = h.indexOf(`aria-labelledby="${secao}"`);
  const fim = h.indexOf("</section>", inicio);
  return [...h.slice(inicio, fim).matchAll(/<li[^>]*>(.*?)<\/li>/g)].map(
    ([, li = ""]) => texto(li)
  );
};

describe("a aluna com medalhas", () => {
  const h = html(ALUNA);

  test("o cabeçalho conta as medalhas ganhas entre marcos e certificados", () => {
    expect(texto(h)).toContain("Conquistas 5 medalhas ganhas de 12");
    expect(texto(h)).toContain("Marcos 4 de 7");
    expect(texto(h)).toContain("Certificados 1 de 5 cursos");
  });

  test("os marcos, na ordem, com a regra, a data e o fato ou o próximo passo", () => {
    expect(linhas(h, "conquistas-marcos")).toEqual([
      "Primeira aula Assista a uma aula até o fim. Ganha em 18 de ago. Como responder, em Autoavaliação Comercial",
      "10 aulas Assista a 10 aulas até o fim. Ganha em 9 de set.",
      "50 aulas Assista a 50 aulas até o fim. 49 de 50 aulas",
      "100 aulas Assista a 100 aulas até o fim. 49 de 100 aulas",
      "Sete dias seguidos Assista a uma aula nova em 7 dias úteis seguidos. Sábado e domingo não quebram. 3 de 7 dias úteis Assista uma aula hoje para chegar a 4.",
      "Primeira troca Troque pontos por um curso. Ganha em 13 de out. Boas práticas de fabricação, por 200 pts",
      "Primeiro curso concluído Conclua um curso e receba o certificado. Ganha em 2 de set. Autoavaliação Comercial",
    ]);
  });

  test("os certificados: o emitido com o código, sem link, e os outros com as aulas", () => {
    expect(linhas(h, "conquistas-certificados")).toEqual([
      "Autoavaliação Comercial Código PS-M0-2026-3F9A1C Emitido em 2 de set.",
      "Comercial Assista a todas as aulas e passe nos questionários. 46 de 90 aulas",
      "Nova Rotina de Fechamento Assista a todas as aulas e passe nos questionários. 3 de 9 aulas",
      "Fábrica e montagem Assista a todas as aulas e passe nos questionários. 0 de 7 aulas",
      "Boas práticas de fabricação Assista a todas as aulas e passe nos questionários. 0 de 3 aulas",
    ]);
    expect(h).not.toContain("<a ");
  });

  test("a medalha ganha é o disco cheio, e a por ganhar, o tracejado", () => {
    const medalhas = [...h.matchAll(/data-medalha="(\w+)"/g)].map(([, m]) => m);
    expect(medalhas).toEqual([
      "ganha",
      "ganha",
      "por_ganhar",
      "por_ganhar",
      "por_ganhar",
      "ganha",
      "ganha",
    ]);
  });

  test("a data de outro ano ganha o ano", () => {
    const virada = { ...ALUNA, hoje: "2027-01-05" as DiaISO };
    expect(linhas(html(virada), "conquistas-marcos")[0]).toContain(
      "Ganha em 18 de ago. de 2026"
    );
  });
});

describe("o aluno novo", () => {
  const h = html(NOVO);

  test("sem medalha, o cabeçalho diz que ainda não há", () => {
    expect(texto(h)).toContain("Conquistas Nenhuma medalha ainda");
    expect(texto(h)).toContain("Marcos 0 de 7");
    expect(texto(h)).toContain("Certificados 0 de 1 curso");
  });

  test("cada marco diz o próximo passo", () => {
    expect(linhas(h, "conquistas-marcos")).toEqual([
      "Primeira aula Assista a uma aula até o fim. Por ganhar Comece por Riscos do posto de montagem, em Fábrica e montagem.",
      "10 aulas Assista a 10 aulas até o fim. 0 de 10 aulas",
      "50 aulas Assista a 50 aulas até o fim. 0 de 50 aulas",
      "100 aulas Assista a 100 aulas até o fim. 0 de 100 aulas",
      "Sete dias seguidos Assista a uma aula nova em 7 dias úteis seguidos. Sábado e domingo não quebram. 0 de 7 dias úteis Uma aula por dia útil, por 7 dias.",
      "Primeira troca Troque pontos por um curso. Por ganhar Cada aula vale 10 pts; o curso mais barato custa 200 pts.",
      "Primeiro curso concluído Conclua um curso e receba o certificado. Por ganhar Fábrica e montagem tem 7 aulas.",
    ]);
  });
});

describe("as frases que mudam com o progresso", () => {
  const comMarco = (i: number, medalha: object): Conquistas => ({
    ...NOVO,
    marcos: NOVO.marcos.map((m, j) =>
      j === i ? ({ ...m, medalha } as (typeof NOVO.marcos)[number]) : m
    ),
  });
  const linha = (c: Conquistas, i: number) =>
    linhas(html(c), "conquistas-marcos")[i];

  test("continuar a aula começada", () => {
    expect(
      linha(
        comMarco(0, {
          estado: "por_ganhar",
          proxima: { aula: "Aula 2", curso: "Curso", tipo: "continuar" },
        }),
        0
      )
    ).toEndWith("Termine Aula 2, em Curso.");
  });

  test("a sequência com hoje já feito conta o que falta", () => {
    expect(
      linha(
        comMarco(4, {
          dias: 6,
          estado: "por_ganhar",
          hojePendente: false,
          meta: 7,
        }),
        4
      )
    ).toEndWith("6 de 7 dias úteis Falta 1 dia útil.");
  });

  test("a sequência ganha mais de uma vez diz quantas", () => {
    expect(
      linha(comMarco(4, { dia: "2026-09-25", estado: "ganha", vezes: 3 }), 4)
    ).toEndWith("Ganha em 25 de set. 3 vezes até hoje");
  });

  test("sem curso trocável, a troca não promete preço", () => {
    expect(
      linha(
        comMarco(5, {
          estado: "por_ganhar",
          maisBarato: null,
          pontosPorAula: 10,
        }),
        5
      )
    ).toEndWith("Cada aula vale 10 pts. Nenhum curso novo para trocar agora.");
  });

  test("o curso mais perto, com aula assistida e sem aula faltando", () => {
    const perto = (feitas: number) =>
      linha(
        comMarco(6, {
          estado: "por_ganhar",
          maisPerto: { curso: "Fábrica e montagem", feitas, total: 7 },
        }),
        6
      );
    expect(perto(5)).toEndWith("Faltam 2 aulas em Fábrica e montagem.");
    expect(perto(7)).toEndWith(
      "Só faltam os questionários de Fábrica e montagem."
    );
  });

  test("sem curso, os certificados dizem onde vão aparecer", () => {
    const h = html({ ...NOVO, certificados: [] });
    expect(texto(h)).toContain(
      "Certificados O certificado de cada curso liberado para você aparece aqui."
    );
  });
});
