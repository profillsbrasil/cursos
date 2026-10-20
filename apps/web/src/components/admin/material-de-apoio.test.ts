import { describe, expect, test } from "bun:test";
import type { MaterialDoDocumento } from "@cursos/api/dominio/edicao-do-curso";
import { documentoDeExemplo, uuidDeExemplo } from "@cursos/api/dominio/exemplo";
import type { MaterialId, Versao } from "@cursos/api/dominio/tipos";

import { resumoDoMaterial } from "./material-de-apoio";
import { ID } from "./rascunho-do-curso";
import {
  type AcaoDoEditor,
  dentroDoLimite,
  type EnvioDeMaterial,
  linhasDoMaterial,
  type RascunhoDoEditor,
  RECUSA_DO_LIMITE,
  rascunhoDoEditor,
  rascunhoDoEditorEm,
  telaDo,
} from "./rascunho-do-editor";

const idDe = (n: number) => uuidDeExemplo(900 + n) as MaterialId;

const material = (n: number): MaterialDoDocumento => ({
  bytes: 1000 * n,
  chave: `${String(n).padStart(64, "0")}.pdf`,
  id: idDe(n),
  nomeDoArquivo: `arquivo-${n}.pdf`,
  tipo: "pdf",
  titulo: `Material ${n}`,
});

const enviando = (n: number): EnvioDeMaterial => ({
  bytes: 1000 * n,
  estado: { tipo: "enviando" },
  id: idDe(n),
  nomeDoArquivo: `arquivo-${n}.pdf`,
  tipo: "pdf",
});

const salvo = (materiais: MaterialDoDocumento[] = []) =>
  rascunhoDoEditorEm({ ...documentoDeExemplo("v1" as Versao), materiais });

const aplicar = (e: RascunhoDoEditor, ...acoes: AcaoDoEditor[]) =>
  acoes.reduce(rascunhoDoEditor, e);

const titulos = (e: RascunhoDoEditor) =>
  e.rascunho.materiais.map((m) => m.titulo);

/** A lista que a seção mostra: o título de cada material e o arquivo de cada envio. */
const linhas = (e: RascunhoDoEditor) =>
  linhasDoMaterial(e).map((l) =>
    l.tipo === "material"
      ? l.material.titulo
      : `subindo ${l.envio.nomeDoArquivo}`
  );

describe("material de apoio no rascunho", () => {
  test("o arquivo escolhido fica subindo e prende o admin; o recebido entra no fim com o título sugerido", () => {
    const antes = salvo([material(1)]);
    const subindo = aplicar(antes, {
      envios: [enviando(2)],
      tipo: "materiais_escolhidos",
    });
    expect(telaDo(subindo).sujo).toBe(true);
    expect(titulos(subindo)).toEqual(["Material 1"]);

    const pronto = aplicar(subindo, {
      material: { ...material(2), titulo: "arquivo 2" },
      tipo: "material_recebido",
    });
    expect(titulos(pronto)).toEqual(["Material 1", "arquivo 2"]);
    expect(pronto.daGeracao.envios).toEqual([]);
    expect(telaDo(pronto).envio?.documento.materiais.map((m) => m.id)).toEqual([
      idDe(1),
      idDe(2),
    ]);
  });

  test("a recusa do servidor fica na linha com o motivo, não prende o admin e sai pelo X", () => {
    const recusado = aplicar(
      salvo(),
      { envios: [enviando(3)], tipo: "materiais_escolhidos" },
      {
        id: idDe(3),
        motivo: "Tem 61,6 MB. O limite é 50 MB por arquivo.",
        tipo: "material_recusado",
      }
    );
    expect(recusado.daGeracao.envios.map((x) => x.estado)).toEqual([
      {
        motivo: "Tem 61,6 MB. O limite é 50 MB por arquivo.",
        tipo: "recusado",
      },
    ]);
    expect(telaDo(recusado).sujo).toBe(false);
    expect(
      aplicar(recusado, { id: idDe(3), tipo: "envio_tirado" }).daGeracao.envios
    ).toEqual([]);
  });

  test("o envio que volta depois do Recarregar não entra no rascunho novo", () => {
    const depois = aplicar(
      salvo(),
      { envios: [enviando(4)], tipo: "materiais_escolhidos" },
      { tipo: "descartado" },
      { material: material(4), tipo: "material_recebido" }
    );
    expect(titulos(depois)).toEqual([]);
    expect(telaDo(depois).sujo).toBe(false);
  });

  test("renomear, mover pelo índice e tirar mexem só no material pedido", () => {
    const e = salvo([material(1), material(2), material(3)]);
    const mudado = aplicar(
      e,
      { id: idDe(3), tipo: "material_renomeado", titulo: "Manual" },
      { id: idDe(3), para: 1, tipo: "material_movido" },
      { id: idDe(1), para: 2, tipo: "material_movido" },
      { id: idDe(2), tipo: "material_removido" }
    );
    expect(titulos(mudado)).toEqual(["Manual", "Material 1"]);
    expect(telaDo(mudado).sujo).toBe(true);
    expect(
      titulos(aplicar(e, { id: idDe(1), para: 2, tipo: "material_movido" }))
    ).toEqual(["Material 2", "Material 3", "Material 1"]);
    expect(aplicar(e, { id: idDe(3), para: 3, tipo: "material_movido" })).toBe(
      e
    );
  });

  test("três arquivos escolhidos juntos ficam na ordem da seleção, mesmo com o terceiro chegando primeiro", () => {
    const escolhidos = aplicar(salvo([material(1)]), {
      envios: [enviando(2), enviando(3), enviando(4)],
      tipo: "materiais_escolhidos",
    });
    const terceiro = aplicar(escolhidos, {
      material: material(4),
      tipo: "material_recebido",
    });
    expect(linhas(terceiro)).toEqual([
      "Material 1",
      "subindo arquivo-2.pdf",
      "subindo arquivo-3.pdf",
      "Material 4",
    ]);
    const todos = aplicar(
      terceiro,
      { material: material(2), tipo: "material_recebido" },
      { material: material(3), tipo: "material_recebido" }
    );
    expect(titulos(todos)).toEqual([
      "Material 1",
      "Material 2",
      "Material 3",
      "Material 4",
    ]);
    expect(todos.daGeracao.envios).toEqual([]);
  });

  test("a linha que sobe fica onde estava quando um material passa por ela ou sai de cima dela", () => {
    const e = aplicar(
      salvo([material(1), material(2)]),
      { envios: [enviando(3)], tipo: "materiais_escolhidos" },
      { id: idDe(2), para: 2, tipo: "material_movido" },
      { id: idDe(1), tipo: "material_removido" },
      { material: material(3), tipo: "material_recebido" }
    );
    expect(titulos(e)).toEqual(["Material 3", "Material 2"]);
  });

  test("título vazio marca o campo da linha quando o admin sai dele", () => {
    const vazio = aplicar(
      salvo([material(1)]),
      { id: idDe(1), tipo: "material_renomeado", titulo: "  " },
      { id: ID.material(idDe(1)), tipo: "saiu_do_campo" }
    );
    expect(telaDo(vazio).erros.get(ID.material(idDe(1)))).toBeDefined();
    expect(telaDo(vazio).envio).toBeNull();
  });

  test("com 18 prontos e 1 subindo, só mais um sobe; o resto sai recusado pelo teto", () => {
    const e = aplicar(
      salvo(Array.from({ length: 18 }, (_, i) => material(i + 1))),
      { envios: [enviando(19)], tipo: "materiais_escolhidos" }
    );
    const novos = dentroDoLimite(e, [
      enviando(20),
      { ...enviando(21), estado: { motivo: "Tipo", tipo: "recusado" } },
      enviando(22),
    ]);
    expect(novos.map((x) => x.estado)).toEqual([
      { tipo: "enviando" },
      { motivo: "Tipo", tipo: "recusado" },
      { motivo: RECUSA_DO_LIMITE, tipo: "recusado" },
    ]);
  });
});

describe("resumo da seção", () => {
  test("conta os arquivos e soma o tamanho; sem arquivo, diz que não tem", () => {
    expect(resumoDoMaterial([])).toBe("Nenhum arquivo");
    expect(
      resumoDoMaterial([
        { bytes: 1_258_291 },
        { bytes: 88_064 },
        { bytes: 15_518_924 },
        { bytes: 6_606_029 },
      ])
    ).toBe("4 arquivos, 22,4 MB");
  });
});
