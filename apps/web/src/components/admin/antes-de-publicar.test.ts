import { describe, expect, test } from "bun:test";
import { documentoDeExemplo } from "@cursos/api/dominio/exemplo";
import type { CategoriaId } from "@cursos/api/dominio/tipos";

import {
  antesDePublicar,
  resumoDoCurso,
  secoesDoEditor,
} from "./antes-de-publicar";
import { rascunhoDoCurso } from "./rascunho-do-curso";

const rascunho = rascunhoDoCurso(documentoDeExemplo());

const lista = (r: typeof rascunho, temCapa = true) =>
  Object.fromEntries(
    antesDePublicar(r, temCapa).map((i) => [i.nome, [i.cumprido, i.detalhe]])
  );

describe("Antes de publicar", () => {
  test("lê capa, título, categoria e descrição do rascunho", () => {
    const vazio = {
      ...rascunho,
      categoriaId: "" as CategoriaId,
      descricao: "  ",
    };
    expect(lista(vazio, false)).toMatchObject({
      Capa: [false, null],
      Descrição: [false, null],
      "Título e categoria": [false, null],
    });
    expect(lista({ ...rascunho, descricao: "Para o técnico." })).toMatchObject({
      Capa: [true, null],
      Descrição: [true, null],
      "Título e categoria": [true, null],
    });
  });

  test("conta as aulas com vídeo válido e as sem questionário", () => {
    const [m1, m2] = rascunho.modulos;
    if (!(m1 && m2)) {
      throw new Error("o exemplo tem dois módulos");
    }
    const r = {
      ...rascunho,
      modulos: [
        {
          ...m1,
          aulas: m1.aulas.map((a, i) => ({
            ...a,
            video: i === 0 ? "youtu.be/dQw4w9WgXcQ" : "não é vídeo",
          })),
        },
        m2,
      ],
    };
    const itens = lista(r);
    expect(itens["Aulas com vídeo"]).toEqual([false, "1 de 3"]);
    expect(itens.Questionários).toEqual([
      false,
      "3 aulas sem questionário. Não impede publicar.",
    ]);
  });

  test("sem aula, nada de vídeo nem de questionário está cumprido", () => {
    const itens = lista({ ...rascunho, modulos: [] });
    expect(itens["Aulas com vídeo"]).toEqual([false, "Nenhuma aula ainda."]);
    expect(itens.Questionários).toEqual([false, null]);
  });
});

describe("índice das seções", () => {
  test("o curso novo não tem Apagar, e as listas levam a contagem", () => {
    expect(secoesDoEditor(rascunho, true).map((s) => s.id)).toEqual([
      "capa-e-descricao",
      "topicos",
      "material",
      "publicacao",
      "niveis",
      "modulos",
    ]);
    const existente = secoesDoEditor(rascunho, false);
    expect(existente.at(-1)?.id).toBe("apagar");
    expect(existente.find((s) => s.id === "modulos")?.contagem).toBe(2);
    expect(existente.find((s) => s.id === "material")?.contagem).toBe(0);
  });

  test("o resumo conta módulos e aulas, e a duração só com vídeo", () => {
    expect(resumoDoCurso(rascunho)).toBe("2 módulos, 3 aulas, 15 min");
    expect(resumoDoCurso({ modulos: [] })).toBe("0 módulos, 0 aulas");
  });
});
