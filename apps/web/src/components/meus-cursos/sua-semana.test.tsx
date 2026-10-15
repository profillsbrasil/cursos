import { describe, expect, test } from "bun:test";
import type { ResumoAluno } from "@cursos/api/dominio/painel";
import type { StatusDia } from "@cursos/api/dominio/sequencia";
import type { DiaISO } from "@cursos/api/dominio/tipos";
import { renderToStaticMarkup } from "react-dom/server";

import { SuaSemana } from "./sua-semana";

const SIGLAS = ["S", "T", "Q", "Q", "S", "S", "D"];
const NOMES = [
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
  "domingo",
];

/** A semana de 12 a 18 de outubro de 2026, com hoje na quinta. */
const resumo = (
  sequenciaDias: number,
  status: readonly StatusDia[]
): ResumoAluno => ({
  bonus: 30,
  dias: status.map((s, i) => ({
    dia: `2026-10-${12 + i}` as DiaISO,
    nome: NOMES[i] ?? "",
    sigla: SIGLAS[i] ?? "",
    status: s,
  })),
  faltamParaBonus: 7,
  pontosSemana: 0,
  saldo: 610,
  sequenciaDias,
});

const ZERO = resumo(0, [
  "nao_estudou",
  "nao_estudou",
  "nao_estudou",
  "hoje_pendente",
  "futuro",
  "fim_de_semana",
  "fim_de_semana",
]);
const TRES_PENDENTE = resumo(3, [
  "estudou",
  "estudou",
  "estudou",
  "hoje_pendente",
  "futuro",
  "fim_de_semana",
  "fim_de_semana",
]);
const QUATRO_FEITO = resumo(4, [
  "estudou",
  "estudou",
  "estudou",
  "hoje_estudou",
  "futuro",
  "fim_de_semana",
  "fim_de_semana",
]);

const html = (r: ResumoAluno) =>
  renderToStaticMarkup(
    <SuaSemana resumo={r} temCursoTrocavelNaVitrine={false} />
  );

const texto = (h: string) =>
  h
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** O texto que o leitor de tela lê: sem o que tem aria-hidden="true", com os aria-label. */
const legivel = (h: string) =>
  texto(
    h
      .replace(/<(\w+)[^>]*aria-hidden="true"[^>]*>.*?<\/\1>/g, " ")
      .replace(/<[^>]*aria-label="([^"]*)"[^>]*>/g, " $1 ")
  );

/** Cada dia da lista: a sigla que se vê, o aria-label e as classes da marca. */
const dias = (h: string) =>
  [
    ...h.matchAll(
      /<li[^>]*><span aria-hidden="true">([^<]*)<\/span><span aria-label="([^"]*)" class="([^"]*)"/g
    ),
  ].map(([, sigla, rotulo, classes]) => ({ classes, rotulo, sigla }));

describe("Sua semana com sequência zero", () => {
  const h = html(ZERO);

  test("a pílula com a chama não aparece, nem para o leitor de tela", () => {
    expect(texto(h)).not.toContain("0 dias seguidos");
    expect(texto(h)).not.toContain("dias seguidos");
    expect(legivel(h)).not.toContain("0 dias");
    expect(h).not.toContain("bg-canela");
  });

  test("a chamada para começar vem logo abaixo dos dias", () => {
    expect(texto(h)).toContain(
      "D Assista uma aula hoje para começar Fim de semana não quebra a sequência"
    );
    expect(h).toContain("text-ceu");
  });
});

describe("Sua semana com sequência", () => {
  test("a pílula com a chama fica, e a chamada não aparece", () => {
    const h = html(TRES_PENDENTE);
    expect(texto(h)).toContain("Sua semana 3 dias seguidos");
    expect(h).toContain("bg-canela");
    expect(texto(h)).not.toContain("Assista uma aula hoje");
  });

  test("um dia só: 1 dia seguido", () => {
    expect(
      texto(
        html(
          resumo(
            1,
            ZERO.dias.map((d) => d.status)
          )
        )
      )
    ).toContain("1 dia seguido");
  });
});

describe("a marca de hoje", () => {
  test('a sigla de hoje é "Hoje", e o rótulo diz o dia e o estado', () => {
    const d = dias(html(TRES_PENDENTE));
    expect(d.map((x) => x.sigla)).toEqual([
      "S",
      "T",
      "Q",
      "Hoje",
      "S",
      "S",
      "D",
    ]);
    expect(d[3]?.rotulo).toBe("quinta-feira: hoje, ainda sem aula");
    expect(dias(html(QUATRO_FEITO))[3]?.rotulo).toBe(
      "quinta-feira: hoje, estudou"
    );
  });

  test("hoje pendente é o círculo com borda de 2 px em titulo, sem o anel Céu", () => {
    const hoje = dias(html(TRES_PENDENTE))[3]?.classes.split(" ") ?? [];
    expect(hoje).toEqual(
      expect.arrayContaining(["ring-2", "ring-titulo", "ring-inset"])
    );
    expect(hoje.join(" ")).not.toContain("--ceu");
    expect(hoje.join(" ")).not.toContain("shadow");
  });

  test("hoje feito é o disco Sol com o check, igual aos outros dias estudados", () => {
    const d = dias(html(QUATRO_FEITO));
    expect(d[3]?.classes).toBe(d[0]?.classes ?? "não achou o primeiro dia");
    expect(d[3]?.classes).toContain("bg-sol");
    expect(d[3]?.classes).not.toContain("shadow");
  });
});
