// O código do curso ("PE-001"). O servidor escolhe no primeiro salvamento, a partir
// da categoria, e não troca depois, nem se a categoria mudar. A migração
// codigo_gerado repete esta regra em SQL, e o codigo-gerado.integration.test.ts
// confere os dois lados.

const MARCAS = /[̀-ͯ]/g;
const FORA_DO_FORMATO = /[^A-Za-z0-9]+/g;

const LIGACAO: ReadonlySet<string> = new Set([
  "A",
  "AS",
  "COM",
  "DA",
  "DAS",
  "DE",
  "DO",
  "DOS",
  "E",
  "EM",
  "O",
  "OS",
  "PARA",
]);

/** Categoria só de palavras de ligação ou sem letra, como "???". */
const SEM_PALAVRA = "CUR";

/**
 * "Processo de envase" vira "PE": sem acento, em maiúsculas e sem as palavras de
 * ligação. Com duas palavras ou mais, as iniciais das quatro primeiras; com uma,
 * as três primeiras letras ("Comercial" vira "COM").
 */
export function siglaDaCategoria(nome: string): string {
  const palavras = nome
    .normalize("NFD")
    .replace(MARCAS, "")
    .replace(FORA_DO_FORMATO, " ")
    .trim()
    .toUpperCase()
    .split(" ")
    .filter((p) => p !== "" && !LIGACAO.has(p));
  const [unica] = palavras;
  if (unica === undefined) {
    return SEM_PALAVRA;
  }
  if (palavras.length === 1) {
    return unica.slice(0, 3);
  }
  return palavras
    .slice(0, 4)
    .map((p) => p[0])
    .join("");
}

const codigoDe = (sigla: string, n: number) =>
  `${sigla}-${String(n).padStart(3, "0")}`;

/** O menor número livre da sigla, a partir de 001, entre os códigos ocupados. */
export function codigoLivre(
  sigla: string,
  ocupados: ReadonlySet<string>
): string {
  let n = 1;
  while (ocupados.has(codigoDe(sigla, n))) {
    n += 1;
  }
  return codigoDe(sigla, n);
}
