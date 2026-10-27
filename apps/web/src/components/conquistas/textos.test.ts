import { describe, expect, test } from "bun:test";
import type { MedalhaDaGrade } from "@cursos/api/dominio/conquistas";
import type { DiaISO } from "@cursos/api/dominio/tipos";

import { ALUNA, NOVO } from "./exemplo-de-teste";
import {
  contagemDaGrade,
  contagemDasMedalhas,
  gradeDasMedalhas,
  linhaDaGrade,
  semGanha,
} from "./textos";

/** A frase curta e a do destaque de uma medalha por ganhar. */
const frase = (m: MedalhaDaGrade) => {
  const l = linhaDaGrade(m);
  return l.estado === "por_ganhar" ? [l.falta, l.detalhe] : null;
};

describe("o que falta em cada medalha por ganhar", () => {
  test("Primeira aula: começar, continuar ou só a regra", () => {
    const aula = (proxima: object | null) =>
      frase({
        medalha: { estado: "por_ganhar", pct: 0, proxima },
        tipo: "primeira_aula",
      } as MedalhaDaGrade)?.[0];
    expect(aula({ aula: "Aula 1", curso: "Curso", tipo: "comecar" })).toBe(
      "Comece por Aula 1, em Curso."
    );
    expect(aula({ aula: "Aula 2", curso: "Curso", tipo: "continuar" })).toBe(
      "Termine Aula 2, em Curso."
    );
    expect(aula(null)).toBe("Assista a uma aula até o fim.");
  });

  test("Primeira troca: o preço do mais barato, ou nenhum curso para trocar", () => {
    const troca = (maisBarato: number | null) =>
      frase({
        medalha: {
          estado: "por_ganhar",
          maisBarato,
          pct: 0,
          pontosPorAula: 10,
        },
        tipo: "primeira_troca",
      });
    expect(troca(200)).toEqual([
      "O curso mais barato custa 200 pts.",
      "Cada aula vale 10 pts.",
    ]);
    expect(troca(null)?.[0]).toBe("Nenhum curso novo para trocar agora.");
  });

  test("Primeiro curso concluído: as aulas que faltam, ou só os questionários", () => {
    const curso = (feitas: number) =>
      frase({
        medalha: {
          estado: "por_ganhar",
          maisPerto: { curso: "Fábrica", feitas, total: 7 },
          pct: 0,
        },
        tipo: "primeiro_curso",
      })?.[0];
    expect(curso(0)).toBe("Fábrica tem 7 aulas.");
    expect(curso(5)).toBe("Faltam 2 aulas em Fábrica.");
    expect(curso(6)).toBe("Falta 1 aula em Fábrica.");
    expect(curso(7)).toBe("Só faltam os questionários de Fábrica.");
  });

  test("Três cursos trocados e Três cursos concluídos contam o que falta", () => {
    const conta = (tipo: "tres_trocas" | "tres_cursos", feitas: number) =>
      frase({
        medalha: { estado: "por_ganhar", feitas, pct: 0, total: 3 },
        tipo,
      })?.[0];
    expect(conta("tres_trocas", 1)).toBe("Faltam 2 trocas.");
    expect(conta("tres_trocas", 2)).toBe("Falta 1 troca.");
    expect(conta("tres_cursos", 0)).toBe("Faltam 3 cursos.");
    expect(conta("tres_cursos", 2)).toBe("Falta 1 curso.");
  });

  test("Da amostra à troca: os dois passos, ou só a troca do curso visto", () => {
    const amostra = (amostraVista: string | null) =>
      frase({
        medalha: {
          amostraVista,
          estado: "por_ganhar",
          feitas: amostraVista ? 1 : 0,
          pct: amostraVista ? 50 : 0,
          total: 2,
        },
        tipo: "amostra_e_troca",
      })?.[0];
    expect(amostra(null)).toBe(
      "Faltam 2 passos: ver uma amostra e trocar o curso."
    );
    expect(amostra("Manutenção básica")).toBe(
      "Falta trocar Manutenção básica."
    );
  });

  test("Troca até o fim: as aulas do trocado, os questionários, ou trocar um", () => {
    const fim = (maisAdiantado: object | null) =>
      frase({
        medalha: { estado: "por_ganhar", maisAdiantado, pct: 0 },
        tipo: "troca_ate_o_fim",
      } as MedalhaDaGrade)?.[0];
    expect(fim({ curso: "Filmagem", feitas: 4, total: 10 })).toBe(
      "4 de 10 aulas de Filmagem."
    );
    expect(fim({ curso: "Filmagem", feitas: 10, total: 10 })).toBe(
      "Só faltam os questionários de Filmagem."
    );
    expect(fim(null)).toBe("Troque um curso e conclua-o.");
  });

  test("Nota cheia: o melhor de primeira, ou a regra", () => {
    const nota = (melhor: { feitas: number; total: number } | null) =>
      frase({
        medalha: { estado: "por_ganhar", melhor, pct: 0 },
        tipo: "nota_cheia",
      })?.[0];
    expect(nota({ feitas: 4, total: 5 })).toBe(
      "Seu melhor de primeira foi 4 de 5."
    );
    expect(nota(null)).toBe("Acerte todas as perguntas na primeira tentativa.");
  });

  test("Mil pontos estudando: a soma de 1.000, e bônus e admin de fora", () => {
    expect(
      frase({
        medalha: { estado: "por_ganhar", feitas: 580, pct: 58, total: 1000 },
        tipo: "mil_pontos",
      })
    ).toEqual(["580 de 1.000 pts.", "Bônus e pontos do admin não contam."]);
  });
});

describe("a ordem da grade", () => {
  test("por ganhar: maior porcentagem primeiro, e o empate pelo nome", () => {
    expect(
      gradeDasMedalhas(ALUNA.medalhas).porGanhar.map((l) => [l.pct, l.nome])
    ).toEqual([
      [80, "Nota cheia"],
      [58, "Mil pontos estudando"],
      [50, "Da amostra à troca"],
      [33, "Três cursos concluídos"],
      [33, "Três cursos trocados"],
      [0, "Troca até o fim"],
    ]);
  });

  test("ganhas: pela data, e o empate pelo nome", () => {
    const ganha = (dia: string) => ({ dia: dia as DiaISO, estado: "ganha" });
    const medalhas = [
      { medalha: ganha("2026-10-02"), tipo: "tres_cursos" },
      { medalha: ganha("2026-10-01"), tipo: "primeira_troca" },
      { medalha: ganha("2026-10-01"), tipo: "primeira_aula" },
    ] as MedalhaDaGrade[];
    expect(gradeDasMedalhas(medalhas).ganhas.map((l) => l.nome)).toEqual([
      "Primeira aula",
      "Primeira troca",
      "Três cursos concluídos",
    ]);
  });
});

describe("as contagens", () => {
  test("Ganhas conta só a grade; o cabeçalho conta tudo", () => {
    expect(contagemDaGrade(ALUNA.medalhas)).toBe("4 de 10");
    expect(contagemDasMedalhas(ALUNA)).toBe("6 medalhas ganhas de 19");
    expect(contagemDasMedalhas(NOVO)).toBe("Nenhuma medalha ainda");
  });

  test("sem ganha, o cartão aponta a aula de começar", () => {
    expect(semGanha(NOVO.medalhas)).toBe(
      "Sua primeira medalha vem com uma aula assistida até o fim. Comece por Riscos do posto de montagem, em Fábrica e montagem."
    );
  });
});
