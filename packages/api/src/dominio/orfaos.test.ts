import { describe, expect, test } from "bun:test";

import {
  type ChavesEmUso,
  DIAS_ATE_COLETAR,
  orfaosDoBucket,
  recusaDoApagar,
} from "./orfaos";

const AGORA = new Date("2026-10-20T12:00:00Z");
const diasAtras = (dias: number) =>
  new Date(AGORA.getTime() - dias * 24 * 60 * 60 * 1000);

const chave = (letra: string, ext: string) => `${letra.repeat(64)}.${ext}`;
const CAPA = chave("a", "jpg");
const MATERIAL = chave("b", "pdf");
const objeto = (c: string, dias: number) => ({
  bytes: 1000,
  chave: c,
  modificadoEm: diasAtras(dias),
});

const EM_USO: ChavesEmUso = {
  capaUrls: [`/capa/${CAPA}`, "/capas/comercial.jpg"],
  chavesDeMaterial: [MATERIAL],
};

describe("orfaosDoBucket", () => {
  test("capa e material em uso ficam em qualquer bucket, mesmo os dois no mesmo", () => {
    const capasDev = [objeto(CAPA, 30), objeto(MATERIAL, 30)];
    const soDeCapas = [objeto(CAPA, 30)];
    const soDeMateriais = [objeto(MATERIAL, 30)];

    for (const bucket of [capasDev, soDeCapas, soDeMateriais]) {
      expect(orfaosDoBucket(EM_USO, bucket, AGORA)).toEqual([]);
    }
  });

  test("material em uso num bucket de capas não é órfão, nem capa num de materiais", () => {
    const trocados = [objeto(MATERIAL, 30), objeto(CAPA, 30)];
    expect(
      orfaosDoBucket(
        { capaUrls: [], chavesDeMaterial: [MATERIAL] },
        trocados,
        AGORA
      ).map((o) => o.chave)
    ).toEqual([CAPA]);
    expect(
      orfaosDoBucket(
        { capaUrls: [`/capa/${CAPA}`], chavesDeMaterial: [] },
        trocados,
        AGORA
      ).map((o) => o.chave)
    ).toEqual([MATERIAL]);
  });

  test("órfão com até 7 dias fica; com mais, sai com a idade, do mais velho ao mais novo", () => {
    const velho = chave("c", "png");
    const maisVelho = chave("d", "zip");
    const novo = chave("e", "webp");
    const noLimite = chave("f", "jpg");

    const orfaos = orfaosDoBucket(
      EM_USO,
      [
        objeto(velho, 8),
        objeto(novo, 1),
        objeto(noLimite, DIAS_ATE_COLETAR),
        objeto(maisVelho, 400),
        objeto(CAPA, 400),
      ],
      AGORA
    );

    expect(orfaos.map((o) => [o.chave, o.idadeEmDias])).toEqual([
      [maisVelho, 400],
      [velho, 8],
    ]);
  });

  test("capa do public/ não protege a chave de mesmo nome no bucket", () => {
    const mesmoNome = chave("9", "jpg");
    const orfaos = orfaosDoBucket(
      { capaUrls: [`/capas/${mesmoNome}`], chavesDeMaterial: [] },
      [objeto(mesmoNome, 30)],
      AGORA
    );
    expect(orfaos.map((o) => o.chave)).toEqual([mesmoNome]);
  });
});

describe("só o que o app gravou é candidato", () => {
  test("objeto com chave fora do formato <sha256>.<ext> nunca é órfão", () => {
    const alheios = [
      objeto("backup/dump.sql", 30),
      objeto("LEIAME.txt", 30),
      objeto(`${"a".repeat(63)}.jpg`, 30),
      objeto(`${"A".repeat(64)}.jpg`, 30),
    ];
    expect(orfaosDoBucket(EM_USO, alheios, AGORA)).toEqual([]);
  });
});

describe("recusaDoApagar", () => {
  test("recusa quando o banco não usa nenhuma chave, como num DATABASE_URL vazio ou errado", () => {
    expect(recusaDoApagar({ capaUrls: [], chavesDeMaterial: [] })).toBeString();
    expect(
      recusaDoApagar({
        capaUrls: ["/capas/comercial.jpg"],
        chavesDeMaterial: [],
      })
    ).toBeString();
  });

  test("deixa apagar quando o banco usa alguma chave do bucket", () => {
    expect(recusaDoApagar(EM_USO)).toBeNull();
    expect(
      recusaDoApagar({ capaUrls: [], chavesDeMaterial: [MATERIAL] })
    ).toBeNull();
  });
});
