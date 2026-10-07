import { describe, expect, test } from "bun:test";

import {
  diaLocal,
  faltamParaBonus,
  segundaDaSemana,
  semana,
  sequenciaDiasUteis,
} from "./sequencia";
import type { DiaISO } from "./tipos";

// 2026-10-02 é sexta, 2026-10-05 é segunda, 2026-10-07 é quarta.
const d = (s: string) => s as DiaISO;
const dias = (...s: string[]) => new Set(s.map(d));

describe("sequenciaDiasUteis", () => {
  test("sexta e segunda estudadas somam 2: fim de semana não quebra", () => {
    expect(
      sequenciaDiasUteis(dias("2026-10-02", "2026-10-05"), d("2026-10-05"))
    ).toBe(2);
  });

  test("hoje sem estudo não zera a sequência de ontem", () => {
    expect(
      sequenciaDiasUteis(dias("2026-10-05", "2026-10-06"), d("2026-10-07"))
    ).toBe(2);
  });

  test("dia útil sem estudo zera a sequência", () => {
    expect(sequenciaDiasUteis(dias("2026-10-05"), d("2026-10-07"))).toBe(0);
  });

  test("estudo no sábado não soma", () => {
    expect(
      sequenciaDiasUteis(
        dias("2026-10-02", "2026-10-03", "2026-10-05"),
        d("2026-10-05")
      )
    ).toBe(2);
  });

  test("hoje sábado parte da sexta", () => {
    expect(
      sequenciaDiasUteis(dias("2026-10-01", "2026-10-02"), d("2026-10-03"))
    ).toBe(2);
  });

  test("sequência atravessa virada de ano", () => {
    const estudo = dias("2026-12-30", "2026-12-31", "2027-01-01", "2027-01-04");
    expect(sequenciaDiasUteis(estudo, d("2027-01-04"))).toBe(4);
  });

  test("feriado sem estudo quebra a sequência", () => {
    // 2026-10-12, segunda, é feriado nacional e conta como dia útil (regra atual).
    expect(
      sequenciaDiasUteis(dias("2026-10-09", "2026-10-13"), d("2026-10-13"))
    ).toBe(1);
  });
});

describe("diaLocal", () => {
  test("diaLocal de 02:00 UTC é o dia anterior em São Paulo", () => {
    expect(diaLocal(new Date("2026-10-07T02:00:00Z"))).toBe(d("2026-10-06"));
  });

  test("domingo 23h30 em São Paulo ainda é domingo", () => {
    expect(diaLocal(new Date("2026-10-12T02:30:00Z"))).toBe(d("2026-10-11"));
  });
});

describe("semana", () => {
  test("semana de uma quarta marca estudou, hoje, futuro e fim de semana", () => {
    const pendente = semana(dias("2026-10-05"), d("2026-10-07"));
    expect(pendente.map((x) => x.status)).toEqual([
      "estudou",
      "nao_estudou",
      "hoje_pendente",
      "futuro",
      "futuro",
      "fim_de_semana",
      "fim_de_semana",
    ]);
    expect(pendente.map((x) => x.sigla).join("")).toBe("STQQSSD");
    expect(pendente[0]).toMatchObject({ dia: "2026-10-05", nome: "Segunda" });
    const estudou = semana(dias("2026-10-05", "2026-10-07"), d("2026-10-07"));
    expect(estudou[2]?.status).toBe("hoje_estudou");
  });

  test("domingo pertence à semana que começa na segunda anterior", () => {
    expect(segundaDaSemana(d("2026-10-11"))).toBe(d("2026-10-05"));
    expect(segundaDaSemana(d("2026-10-05"))).toBe(d("2026-10-05"));
    expect(semana(dias(), d("2026-10-11"))[6]).toMatchObject({
      dia: "2026-10-11",
      status: "fim_de_semana",
    });
  });
});

describe("faltamParaBonus", () => {
  test("faltamParaBonus com 5 dias é 2, com 7 é 7 e com 0 é 7", () => {
    expect(faltamParaBonus(5)).toBe(2);
    expect(faltamParaBonus(7)).toBe(7);
    expect(faltamParaBonus(0)).toBe(7);
  });
});
