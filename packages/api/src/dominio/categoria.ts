// A Categoria é um registro que o admin mantém em admin.categorias. O curso aponta
// para uma pelo id; o aluno só vê o nome.

import { z } from "zod";

import { CARACTERES } from "./edicao-do-curso";
import type { CategoriaId } from "./tipos";

/** O mesmo formato do check categoria_nome_formato: aparado, de 1 a 80 caracteres. */
export const nomeDaCategoria = z
  .string()
  .trim()
  .min(1)
  .max(CARACTERES.categoria);

export interface CategoriaNaLista {
  /** Cursos que apontam para ela. Com algum, ela não se apaga. */
  cursos: number;
  id: CategoriaId;
  nome: string;
}

export const CATEGORIA_SUMIU =
  "A categoria escolhida não existe mais. Escolha outra e salve de novo.";

export const categoriaEmUso = (cursos: number): string =>
  `Esta categoria está em ${cursos} ${cursos === 1 ? "curso" : "cursos"}. Troque a categoria ${cursos === 1 ? "dele" : "deles"} antes de apagar.`;
