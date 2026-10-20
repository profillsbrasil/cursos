import { describe, expect, mock, test } from "bun:test";
import type { ResumoAluno } from "@cursos/api/dominio/painel";
import type { DiaISO } from "@cursos/api/dominio/tipos";
import type { CartaoDeTroca } from "@cursos/api/dominio/troca";
import { renderToStaticMarkup } from "react-dom/server";

import type { AcaoDaRetomada } from "@/components/aluno/continuar";
import { caminhoDaAula } from "@/lib/rotas";

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
  categoria: "Envase",
  duracaoSeg: 900,
  id: "c-1",
  slug: "x",
  titulo: "Curso de envase",
} as CartaoDeTroca["curso"];

const AULA = caminhoDaAula("x", "00000000-0000-4000-8000-000000000001");
const CONTINUAR = {
  href: AULA,
  icone: "play",
  texto: "Continuar aula",
} as const;

const vitrineEmHtml = (
  cartoes: CartaoDeTroca[],
  temCursoTrocavelNaVitrine: boolean,
  retomar: AcaoDaRetomada = CONTINUAR
) =>
  renderToStaticMarkup(
    <CursosParaTrocar
      cartoes={cartoes}
      extrato={[]}
      hoje="2026-10-14"
      retomar={retomar}
      temCursoTrocavelNaVitrine={temCursoTrocavelNaVitrine}
    />
  );

const vitrine = (
  cartoes: CartaoDeTroca[],
  temCursoTrocavelNaVitrine: boolean
) => texto(vitrineEmHtml(cartoes, temCursoTrocavelNaVitrine));

const linkDeVolta = (rotulo: string) =>
  new RegExp(`<a [^>]*href="([^"]*)"[^>]*>(?:<[^>]+>)*${rotulo}</a>`);

describe("a vitrine sem curso trocável tem saída", () => {
  test("vazia: o botão leva aonde a pessoa parou, com o verbo da retomada", () => {
    expect(
      linkDeVolta("Continuar aula").exec(vitrineEmHtml([], false))?.[1]
    ).toBe(AULA);
  });

  test("quem nunca abriu aula começa o curso, sem 'Voltar a estudar'", () => {
    const html = vitrineEmHtml([], false, {
      href: AULA,
      icone: "play",
      texto: "Começar curso",
    });
    expect(linkDeVolta("Começar curso").exec(html)?.[1]).toBe(AULA);
    expect(html).not.toContain("Voltar a estudar");
  });

  test("só com curso já trocado: o botão também aparece", () => {
    const html = vitrineEmHtml([{ curso, pago: 300, tipo: "trocado" }], false);
    expect(linkDeVolta("Continuar aula").exec(html)?.[1]).toBe(AULA);
  });

  test("com curso trocável, a vitrine é a ação e o link não aparece", () => {
    const html = vitrineEmHtml(
      [{ curso, faltam: 200, pct: 60, preco: 500, saldo: 300, tipo: "faltam" }],
      true
    );
    expect(html).not.toContain("Continuar aula");
  });
});

// A vitrine vazia também acontece quando existe curso trocável que o aluno já
// alcança por liberação. A frase fala do lado do aluno, e nenhuma promete prazo
// ou que ponto não vence (decisão aberta do dono no PRODUCT.md).
const PROMESSAS = [
  "guardados",
  "Profills ainda não abriu",
  "Continue estudando",
];

describe("a vitrine sem curso trocável não culpa quem estuda nem promete", () => {
  test("vazia: nenhum curso novo, e os pontos continuam no saldo", () => {
    const t = vitrine([], false);
    expect(t).toContain("Seus pontos continuam no saldo");
    expect(t).toContain(
      "Nenhum curso novo para trocar agora. Quando houver, ele aparece aqui."
    );
    for (const p of PROMESSAS) {
      expect(t).not.toContain(p);
    }
  });

  test("só com curso já trocado: nenhum curso novo para trocar", () => {
    const t = vitrine([{ curso, pago: 300, tipo: "trocado" }], false);
    expect(t).toContain("Nenhum curso novo para trocar agora");
    for (const p of PROMESSAS) {
      expect(t).not.toContain(p);
    }
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

const saldo = (temCursoTrocavelNaVitrine: boolean) =>
  renderToStaticMarkup(
    <SaldoDeTroca
      comoGanhar={[]}
      pontosSemana={0}
      saldo={610}
      temCursoTrocavelNaVitrine={temCursoTrocavelNaVitrine}
    />
  );

describe("o saldo só brilha com curso trocável", () => {
  test("sem curso trocável: sem gradiente nem sombra amarela", () => {
    const html = saldo(false);
    expect(html).not.toContain("radial-gradient");
    expect(html).not.toContain("shadow-brilho-do-saldo");
  });

  test("com curso trocável: o gradiente e o brilho do selo voltam", () => {
    const html = saldo(true);
    expect(html).toContain("radial-gradient");
    expect(html).toContain("shadow-brilho-do-saldo");
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
};

const semana = (temCursoTrocavelNaVitrine: boolean) =>
  renderToStaticMarkup(
    <SuaSemana
      resumo={RESUMO}
      temCursoTrocavelNaVitrine={temCursoTrocavelNaVitrine}
    />
  );

describe("Sua semana só leva a Trocar pontos quando há curso trocável", () => {
  test("sem curso trocável, o botão some", () => {
    expect(semana(false)).not.toContain('href="/trocar-pontos"');
  });

  test("com curso trocável, o botão aparece", () => {
    expect(semana(true)).toContain('href="/trocar-pontos"');
  });
});
