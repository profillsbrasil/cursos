// O endereço do curso (o slug de /cursos/<slug>). O servidor escolhe na criação, a
// partir do título, e não troca depois: o link que o aluno guardou continua abrindo.

import { CARACTERES } from "./limites-do-curso";

/** Deixa espaço para o sufixo "-N" sem passar de CARACTERES.slug. */
const TETO_DA_BASE = CARACTERES.slug - 8;

const DIACRITICOS = /\p{Diacritic}/gu;
const FORA_DO_FORMATO = /[^a-z0-9]+/g;
const HIFEN_NAS_PONTAS = /^-+|-+$/g;
const SUFIXOS_NUMERICOS = /(-\d+)+$/;

/** Título sem letra nem algarismo, como "???". */
const SEM_LETRA = "curso";

/**
 * "Profills School Comercial" vira "profills-school-comercial": minúsculas, sem
 * acento, hífen no lugar de espaço e pontuação. Sempre casa com SLUG, de formatos.ts.
 */
export function slugDoTitulo(titulo: string): string {
  const base = titulo
    .normalize("NFD")
    .replace(DIACRITICOS, "")
    .toLowerCase()
    .replace(FORA_DO_FORMATO, "-")
    .slice(0, TETO_DA_BASE)
    .replace(HIFEN_NAS_PONTAS, "");
  return base || SEM_LETRA;
}

/** A base se está livre; senão a base com o menor sufixo livre, a partir de -2. */
export function slugLivre(base: string, ocupados: ReadonlySet<string>): string {
  if (!ocupados.has(base)) {
    return base;
  }
  let n = 2;
  while (ocupados.has(`${base}-${n}`)) {
    n += 1;
  }
  return `${base}-${n}`;
}

/**
 * A chave da trava de quem escolhe um slug a partir desta base. Todo slug que a
 * base pode virar ("x", "x-2") tem a mesma raiz que a própria base, e a base
 * "x-2" também: dois cursos novos que disputam o mesmo endereço se serializam.
 */
export const raizDoSlug = (base: string): string =>
  base.replace(SUFIXOS_NUMERICOS, "") || base;
