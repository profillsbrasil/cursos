// A Categoria é um registro que o admin mantém em admin.categorias. O curso aponta
// para uma pelo id; o aluno só vê o nome.

import type { CategoriaId } from "./tipos";

export interface CategoriaNaLista {
  /** Títulos dos cursos que apontam para ela, em ordem pt-BR. Com algum, ela não se apaga. */
  cursos: readonly string[];
  id: CategoriaId;
  nome: string;
}

export const CATEGORIA_SUMIU =
  "A categoria escolhida não existe mais. Escolha outra e salve de novo.";

export const categoriaEmUso = (cursos: number): string =>
  `Esta categoria está em ${cursos} ${cursos === 1 ? "curso" : "cursos"}. Troque a categoria ${cursos === 1 ? "dele" : "deles"} antes de apagar.`;
