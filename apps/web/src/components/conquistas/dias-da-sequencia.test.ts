import { describe, expect, test } from "bun:test";
import type { DiaISO } from "@cursos/api/dominio/tipos";

import { diasDaSequencia } from "./dias-da-sequencia";

const SEXTA = "2026-10-16" as DiaISO;
const SABADO = "2026-10-17" as DiaISO;

const resumo = (o: Parameters<typeof diasDaSequencia>[0]) =>
  diasDaSequencia(o).map((d) => `${d.dia.slice(5)} ${d.estado}`);

describe("os sete dias da sequência", () => {
  test("hoje pendente: os feitos terminam no dia útil anterior, e hoje vem depois", () => {
    expect(
      resumo({ dias: 3, hoje: SEXTA, hojePendente: true, meta: 7 })
    ).toEqual([
      "10-13 feito",
      "10-14 feito",
      "10-15 feito",
      "10-16 hoje",
      "10-19 por_vir",
      "10-20 por_vir",
      "10-21 por_vir",
    ]);
  });

  test("hoje com aula: os feitos terminam hoje", () => {
    expect(
      resumo({ dias: 2, hoje: SEXTA, hojePendente: false, meta: 7 })
    ).toEqual([
      "10-15 feito",
      "10-16 feito",
      "10-19 por_vir",
      "10-20 por_vir",
      "10-21 por_vir",
      "10-22 por_vir",
      "10-23 por_vir",
    ]);
  });

  test("a sequência atravessa o fim de semana sem contar sábado e domingo", () => {
    expect(
      resumo({
        dias: 4,
        hoje: "2026-10-20" as DiaISO,
        hojePendente: true,
        meta: 7,
      })
    ).toEqual([
      "10-14 feito",
      "10-15 feito",
      "10-16 feito",
      "10-19 feito",
      "10-20 hoje",
      "10-21 por_vir",
      "10-22 por_vir",
    ]);
  });

  test("no sábado não há hoje: os feitos terminam na sexta", () => {
    expect(
      resumo({ dias: 1, hoje: SABADO, hojePendente: false, meta: 7 })
    ).toEqual([
      "10-16 feito",
      "10-19 por_vir",
      "10-20 por_vir",
      "10-21 por_vir",
      "10-22 por_vir",
      "10-23 por_vir",
      "10-26 por_vir",
    ]);
  });

  test("sem dia feito e hoje pendente, hoje abre a semana", () => {
    expect(
      resumo({ dias: 0, hoje: SEXTA, hojePendente: true, meta: 7 })[0]
    ).toBe("10-16 hoje");
  });

  const fins = (o: Parameters<typeof diasDaSequencia>[0]) =>
    diasDaSequencia(o).flatMap((d, i) =>
      d.depoisDoFimDeSemana ? [`${i}: ${d.dia.slice(5)}`] : []
    );

  test("marca o dia que vem depois de sábado e domingo", () => {
    expect(fins({ dias: 3, hoje: SEXTA, hojePendente: true, meta: 7 })).toEqual(
      ["4: 10-19"]
    );
  });

  test("sete dias úteis a partir de uma sexta atravessam dois fins de semana", () => {
    expect(fins({ dias: 0, hoje: SEXTA, hojePendente: true, meta: 7 })).toEqual(
      ["1: 10-19", "6: 10-26"]
    );
  });

  test("de segunda a sexta seguidas, nenhuma marca, e o primeiro dia nunca leva", () => {
    expect(
      fins({
        dias: 0,
        hoje: "2026-10-19" as DiaISO,
        hojePendente: true,
        meta: 5,
      })
    ).toEqual([]);
  });
});
