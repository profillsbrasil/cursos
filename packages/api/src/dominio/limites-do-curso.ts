// Os tetos do curso que o editor e o servidor dividem. Fica fora de
// edicao-do-curso.ts, que importa o Zod: a tela de Categorias e o endereço só
// precisam dos números, e o Zod pesa cerca de 90 KB em gzip no navegador.

import { LIMITE_DO_MATERIAL } from "./material";

/**
 * Tetos do documento. gravarCurso deriva deles o deslocamento que regrava números
 * e posições sem colidir nos uniques não deferrable.
 */
export const LIMITES = {
  aulasPorModulo: 500,
  /** O teto de cada arquivo; o check material_bytes_limite repete. */
  bytesDoMaterial: LIMITE_DO_MATERIAL.bytes,
  materiais: LIMITE_DO_MATERIAL.porCurso,
  modulos: 200,
  niveis: 50,
  numeroDeModulo: 999,
  perguntasPorAula: 20,
  /** O check curso_topicos_validos repete este teto. */
  topicos: 10,
} as const;

export const CARACTERES = {
  alternativa: 200,
  categoria: 80,
  descricao: 2000,
  descricaoDaAula: 2000,
  enunciado: 500,
  nomeDoArquivo: LIMITE_DO_MATERIAL.nomeDoArquivo,
  nomeDoNivel: 60,
  slug: 80,
  titulo: 120,
  tituloDaAula: 160,
  tituloDoMaterial: LIMITE_DO_MATERIAL.titulo,
  tituloDoModulo: 160,
  topico: 120,
} as const;

/**
 * Todo curso publicado tem preço de troca: a liberação do perfil dá só a
 * amostra, e o resto do curso abre pela troca (docs/adr/0004-amostra-pelo-perfil.md).
 * O "Antes de publicar" do editor e a recusa do salvarCurso dizem esta frase.
 */
export const PRECO_PARA_PUBLICAR =
  "Todo curso tem preço em pontos para publicar.";
