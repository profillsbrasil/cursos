import { describe, expect, mock, test } from "bun:test";
import type { ResumoAluno } from "@cursos/api/dominio/painel";
import type { DiaISO } from "@cursos/api/dominio/tipos";
import type { CartaoDeTroca } from "@cursos/api/dominio/troca";
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

const { CursosParaTrocar } = await import("./cursos-para-trocar");
const { SaldoDeTroca } = await import("./saldo-de-troca");
const { SuaSemana } = await import("@/components/meus-cursos/sua-semana");

const TAG = /<[^>]+>/g;
const texto = (html: string) => html.replace(TAG, " ").replace(/\s+/g, " ");

const curso = {
  aulas: 3,
  capa: { alt: "Capa", altura: 720, largura: 1280, url: "/capas/x.jpg" },
  duracaoSeg: 900,
  id: "c-1",
  slug: "x",
  tema: "Envase",
  titulo: "Curso de envase",
} as CartaoDeTroca["curso"];

const vitrine = (cartoes: CartaoDeTroca[], temCursoTrocavel: boolean) =>
  texto(
    renderToStaticMarkup(
      <CursosParaTrocar
        cartoes={cartoes}
        extrato={[]}
        hoje="2026-10-14"
        temCursoTrocavel={temCursoTrocavel}
      />
    )
  );

describe("a vitrine sem curso trocável não culpa quem estuda", () => {
  test("vazia: os pontos ficam guardados e a Profills ainda não abriu cursos", () => {
    const t = vitrine([], false);
    expect(t).toContain("Seus pontos ficam guardados");
    expect(t).toContain("A Profills ainda não abriu cursos para troca.");
    expect(t).not.toContain("Continue estudando");
  });

  test("só com curso já trocado: os pontos esperam o próximo curso", () => {
    const t = vitrine([{ curso, pago: 300, tipo: "trocado" }], false);
    expect(t).toContain(
      "Seus pontos ficam guardados até o próximo curso abrir para troca"
    );
    expect(t).not.toContain("Continue estudando");
  });

  test("com curso trocável que falta pontos, a frase de antes fica", () => {
    const t = vitrine(
      [
        {
          curso,
          faltam: 200,
          pct: 60,
          preco: 500,
          saldo: 300,
          tipo: "faltam",
        },
      ],
      true
    );
    expect(t).toContain("Continue estudando para juntar pontos");
  });
});

const saldo = (temCursoTrocavel: boolean) =>
  renderToStaticMarkup(
    <SaldoDeTroca
      comoGanhar={[]}
      pontosSemana={0}
      saldo={610}
      temCursoTrocavel={temCursoTrocavel}
    />
  );

describe("o saldo só brilha com curso trocável", () => {
  test("sem curso trocável: sem gradiente nem sombra amarela", () => {
    const html = saldo(false);
    expect(html).not.toContain("radial-gradient");
    expect(html).not.toContain("shadow-[0_10px_30px");
  });

  test("com curso trocável: o gradiente e o brilho do selo voltam", () => {
    const html = saldo(true);
    expect(html).toContain("radial-gradient");
    expect(html).toContain("shadow-[0_10px_30px");
  });
});

const RESUMO: ResumoAluno = {
  bonus: 30,
  dias: [
    {
      dia: "2026-10-14" as DiaISO,
      nome: "quarta-feira",
      sigla: "Q",
      status: "hoje_pendente",
    },
  ],
  faltamParaBonus: 7,
  pontosSemana: 0,
  saldo: 610,
  sequenciaDias: 0,
  temCursoTrocavel: false,
};

const semana = (temCursoTrocavel: boolean) =>
  renderToStaticMarkup(<SuaSemana resumo={{ ...RESUMO, temCursoTrocavel }} />);

describe("Sua semana só leva a Trocar pontos quando há curso trocável", () => {
  test("sem curso trocável, o botão some", () => {
    expect(semana(false)).not.toContain('href="/trocar-pontos"');
  });

  test("com curso trocável, o botão aparece", () => {
    expect(semana(true)).toContain('href="/trocar-pontos"');
  });
});
