import { describe, expect, test } from "bun:test";

import {
  aplicarRegistro,
  type Cota,
  conquistaDe,
  type EstudoSalvo,
  lancamentosDaAssistida,
  recarregar,
} from "./registro";
import { COTA_VIDEO } from "./regras";
import { diaUtilAnterior } from "./sequencia";
import type { AulaId, DiaISO } from "./tipos";
import { canonizar, SEM_TRECHOS, segundos, type Trecho } from "./trechos";

const AULA = "aula-1" as AulaId;
const T0 = new Date("2026-10-07T18:00:00Z");
const em = (s: number) => new Date(T0.getTime() + s * 1000);
const t = (inicio: number, fim: number): Trecho => ({ fim, inicio });
const novo = (duracaoSeg = 600): EstudoSalvo => ({
  assistida: false,
  duracaoSeg,
  trechos: SEM_TRECHOS,
});

describe("recarregar", () => {
  test("sem cota, o balde está cheio", () => {
    expect(recarregar(null, T0)).toBe(COTA_VIDEO.tetoSeg);
  });

  test("enche 2 s por segundo de relógio até o teto", () => {
    const cota: Cota = { atualizadaEm: T0, segundos: 0 };
    expect(recarregar(cota, em(10))).toBe(20);
    expect(recarregar(cota, em(1000))).toBe(COTA_VIDEO.tetoSeg);
  });

  test("relógio que volta não enche nem esvazia", () => {
    expect(recarregar({ atualizadaEm: T0, segundos: 30 }, em(-60))).toBe(30);
  });
});

describe("aplicarRegistro", () => {
  test("pular para o fim cobre só o que tocou", () => {
    const r = aplicarRegistro(
      novo(),
      null,
      { posicaoSeg: 600, trechos: [t(0, 10), t(570, 600)] },
      T0
    );
    expect<readonly Trecho[]>(r.trechos).toEqual([t(0, 10), t(570, 600)]);
    expect(r.viraAssistida).toBe(false);
  });

  test("600 s de cara leva só 180, na ordem em que tocou", () => {
    const r = aplicarRegistro(
      novo(),
      null,
      { posicaoSeg: 600, trechos: [t(0, 600)] },
      T0
    );
    expect(segundos(r.trechos)).toBe(180);
    expect(r.recusadosSeg).toBe(420);
    expect<readonly Trecho[]>(r.trechos).toEqual([t(0, 180)]);
    expect(r.cota.segundos).toBe(0);
  });

  test("o mesmo pedido duas vezes não gasta cota nem muda trechos", () => {
    const pedido = { posicaoSeg: 30, trechos: [t(0, 30)] };
    const um = aplicarRegistro(novo(), null, pedido, T0);
    const dois = aplicarRegistro(
      { ...novo(), trechos: um.trechos },
      um.cota,
      pedido,
      T0
    );
    expect(dois.trechos).toEqual(um.trechos);
    expect(dois.cota.segundos).toBe(um.cota.segundos);
  });

  test("segundo já coberto não gasta", () => {
    const salvo = { ...novo(), trechos: canonizar([t(0, 100)], 600) };
    const r = aplicarRegistro(
      salvo,
      { atualizadaEm: T0, segundos: 10 },
      { posicaoSeg: 110, trechos: [t(90, 110)] },
      T0
    );
    expect(r.cota.segundos).toBe(0);
    expect(r.recusadosSeg).toBe(0);
    expect<readonly Trecho[]>(r.trechos).toEqual([t(0, 110)]);
  });

  test("relógio que volta não enche o balde", () => {
    const r = aplicarRegistro(
      novo(),
      { atualizadaEm: T0, segundos: 5 },
      { posicaoSeg: 20, trechos: [t(0, 20)] },
      em(-120)
    );
    expect(segundos(r.trechos)).toBe(5);
  });

  test("chamada com relógio atrasado não volta a cota no tempo", () => {
    const a = aplicarRegistro(
      novo(),
      { atualizadaEm: T0, segundos: 0 },
      { posicaoSeg: 100, trechos: [t(0, 100)] },
      em(10)
    );
    const b = aplicarRegistro(
      { ...novo(), trechos: a.trechos },
      a.cota,
      { posicaoSeg: 200, trechos: [t(100, 200)] },
      em(4)
    );
    const c = aplicarRegistro(
      { ...novo(), trechos: b.trechos },
      b.cota,
      { posicaoSeg: 300, trechos: [t(200, 300)] },
      em(11)
    );
    expect(b.cota.atualizadaEm).toEqual(em(10));
    expect(segundos(c.trechos) - segundos(b.trechos)).toBe(2);
  });

  test("posição fica entre 0 e a duração", () => {
    const pedido = (posicaoSeg: number) => ({ posicaoSeg, trechos: [] });
    expect(aplicarRegistro(novo(), null, pedido(9999), T0).posicaoSeg).toBe(
      600
    );
    expect(aplicarRegistro(novo(), null, pedido(-3), T0).posicaoSeg).toBe(0);
  });

  test("cruzar 540 de 600 vira assistida", () => {
    const salvo = { ...novo(), trechos: canonizar([t(0, 525)], 600) };
    const r = aplicarRegistro(
      salvo,
      { atualizadaEm: T0, segundos: 0 },
      { posicaoSeg: 540, trechos: [t(525, 540)] },
      em(15)
    );
    expect(segundos(r.trechos)).toBe(540);
    expect(r.viraAssistida).toBe(true);
  });

  test("aula já assistida nunca vira assistida de novo", () => {
    const r = aplicarRegistro(
      {
        assistida: true,
        duracaoSeg: 600,
        trechos: canonizar([t(0, 600)], 600),
      },
      null,
      { posicaoSeg: 600, trechos: [t(0, 600)] },
      T0
    );
    expect(r.viraAssistida).toBe(false);
  });
});

describe("lancamentosDaAssistida", () => {
  const d = (s: string) => s as DiaISO;
  const uteisAntes = (dia: DiaISO, n: number) => {
    const dias = new Set<DiaISO>();
    let cursor = dia;
    for (let i = 0; i < n; i += 1) {
      cursor = diaUtilAnterior(cursor);
      dias.add(cursor);
    }
    return dias;
  };
  const QUARTA = d("2026-10-07");
  const SABADO = d("2026-10-10");
  const SEGUNDA = d("2026-10-12");
  const bonus = (dia: DiaISO, antes: Set<DiaISO>) => {
    const e = lancamentosDaAssistida(AULA, dia, antes);
    return {
      bonus: e.lancamentos.some((l) => l.motivo === "sequencia_7_dias"),
      seq: e.sequenciaDias,
    };
  };

  test.each([
    ["6 dias úteis antes e quarta", QUARTA, uteisAntes(QUARTA, 6), 7, true],
    ["5 dias úteis antes e quarta", QUARTA, uteisAntes(QUARTA, 5), 6, false],
    ["13 dias úteis antes e quarta", QUARTA, uteisAntes(QUARTA, 13), 14, true],
    [
      "segunda aula da quarta",
      QUARTA,
      new Set([...uteisAntes(QUARTA, 6), QUARTA]),
      7,
      false,
    ],
    ["sábado com 7 úteis antes", SABADO, uteisAntes(SABADO, 7), 7, false],
    [
      "segunda depois do fim de semana",
      SEGUNDA,
      uteisAntes(SEGUNDA, 6),
      7,
      true,
    ],
  ] as const)("%s", (_nome, dia, antes, seq, temBonus) => {
    expect(bonus(dia, new Set(antes))).toEqual({ bonus: temBonus, seq });
  });

  test("o lançamento da aula vem sempre, e a conquista soma o bônus", () => {
    const e = lancamentosDaAssistida(AULA, QUARTA, uteisAntes(QUARTA, 6));
    expect(e.lancamentos).toEqual([
      { aulaId: AULA, motivo: "aula_assistida", pontos: 10 },
      { diaMarco: QUARTA, motivo: "sequencia_7_dias", pontos: 30 },
    ]);
    expect(conquistaDe(e.lancamentos, e.sequenciaDias)).toEqual({
      bonusSequencia: 30,
      pontos: 10,
      sequenciaDias: 7,
    });
  });
});
