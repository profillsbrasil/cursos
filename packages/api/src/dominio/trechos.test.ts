import { describe, expect, test } from "bun:test";

import {
  atingiuMeta,
  canonizar,
  cobertura,
  primeiros,
  quantizar,
  SEM_TRECHOS,
  segundos,
  subtrair,
  type Trecho,
  unir,
} from "./trechos";

const t = (inicio: number, fim: number): Trecho => ({ fim, inicio });
const c = (...lista: Trecho[]) => canonizar(lista, 600);

describe("canonizar", () => {
  test("ordena, funde sobrepostos e encostados", () => {
    expect<readonly Trecho[]>(
      canonizar([t(50, 60), t(0, 10), t(10, 20), t(15, 30)], 600)
    ).toEqual([t(0, 30), t(50, 60)]);
  });

  test("corta em [0, duração) e descarta o que ficou vazio", () => {
    expect<readonly Trecho[]>(
      canonizar([t(-5, 5), t(590, 700), t(650, 700), t(9, 9)], 600)
    ).toEqual([t(0, 5), t(590, 600)]);
  });

  test("lista vazia dá vazio", () => {
    expect<readonly Trecho[]>(canonizar([], 600)).toEqual([]);
  });
});

describe("unir", () => {
  const a = c(t(0, 30), t(100, 120));
  const b = c(t(20, 50), t(200, 210));

  test("é idempotente", () => {
    expect(unir(a, a)).toEqual(a);
  });

  test("é comutativa", () => {
    expect(unir(a, b)).toEqual(unir(b, a));
    expect<readonly Trecho[]>(unir(a, b)).toEqual([
      t(0, 50),
      t(100, 120),
      t(200, 210),
    ]);
  });

  test("com vazio devolve o outro", () => {
    expect(unir(SEM_TRECHOS, a)).toEqual(a);
  });
});

describe("subtrair", () => {
  test("tira o que já está em b", () => {
    expect<readonly Trecho[]>(
      subtrair(c(t(0, 100)), c(t(10, 20), t(50, 60)))
    ).toEqual([t(0, 10), t(20, 50), t(60, 100)]);
  });

  test("b cobrindo tudo dá vazio", () => {
    expect<readonly Trecho[]>(subtrair(c(t(10, 20)), c(t(0, 30)))).toEqual([]);
  });

  test("b sem interseção devolve a", () => {
    expect<readonly Trecho[]>(
      subtrair(c(t(10, 20), t(40, 50)), c(t(25, 30)))
    ).toEqual([t(10, 20), t(40, 50)]);
  });
});

describe("primeiros", () => {
  test("pega os primeiros segundos na ordem dos trechos", () => {
    expect<readonly Trecho[]>(primeiros(c(t(0, 10), t(20, 40)), 15)).toEqual([
      t(0, 10),
      t(20, 25),
    ]);
  });

  test("fração arredonda para baixo e zero dá vazio", () => {
    expect<readonly Trecho[]>(primeiros(c(t(0, 10)), 3.9)).toEqual([t(0, 3)]);
    expect<readonly Trecho[]>(primeiros(c(t(0, 10)), 0)).toEqual([]);
  });
});

describe("meta e cobertura", () => {
  test("539 de 600 não atinge, 540 atinge", () => {
    expect(atingiuMeta(539, 600)).toBe(false);
    expect(atingiuMeta(540, 600)).toBe(true);
  });

  test("cobertura usa floor", () => {
    expect(cobertura(c(t(0, 539)), 600)).toEqual({ pct: 89, vistosSeg: 539 });
    expect(segundos(c(t(0, 10), t(20, 25)))).toBe(15);
  });
});

describe("quantizar", () => {
  test("cortes sucessivos no mesmo ponto não deixam buraco", () => {
    const a = quantizar(3.2, 17.6);
    const b = quantizar(17.6, 31.1);
    expect(a).toEqual(t(3, 17));
    expect(b).toEqual(t(17, 31));
    expect<readonly Trecho[]>(
      canonizar([a as Trecho, b as Trecho], 600)
    ).toEqual([t(3, 31)]);
  });

  test("trecho que não cruza um segundo inteiro vira null", () => {
    expect(quantizar(4.1, 4.9)).toBeNull();
  });
});
