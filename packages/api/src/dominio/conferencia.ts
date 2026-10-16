export const ALFABETO_DO_CODIGO = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

declare const marca: unique symbol;

/** O código no formato do banco: `XXXX-XXXX`, em maiúsculas. */
export type CodigoDoCertificado = string & {
  readonly [marca]: "CodigoDoCertificado";
};

const SEPARADORES = /[\s\-‐-―]/g;
const OITO_DO_ALFABETO = new RegExp(`^[${ALFABETO_DO_CODIGO}]{8}$`);

export function codigoDigitado(texto: string): CodigoDoCertificado | null {
  const limpo = texto.toUpperCase().replace(SEPARADORES, "");
  return OITO_DO_ALFABETO.test(limpo)
    ? (`${limpo.slice(0, 4)}-${limpo.slice(4)}` as CodigoDoCertificado)
    : null;
}
