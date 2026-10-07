import { customType } from "drizzle-orm/pg-core";

/** [inicio, fim) de segundos inteiros: uma faixa de int4multirange. */
export interface FaixaSeg {
  readonly fim: number;
  readonly inicio: number;
}

const FAIXA = /^\[(-?\d+),(-?\d+)\)$/;
const CHAVES = /^\{|\}$/g;
const ENTRE_FAIXAS = /,(?=\[)/;

/**
 * "{}" para [] e "{[0,30),[45,90)}" para [{0,30},{45,90}]. O Postgres canoniza int4
 * para "[)", então "(" e "]" nunca chegam; texto fora do formato lança.
 */
export function lerMultirange(texto: string): FaixaSeg[] {
  const miolo = texto.trim().replace(CHAVES, "");
  if (miolo === "") {
    return [];
  }
  return miolo.split(ENTRE_FAIXAS).map((parte) => {
    const m = FAIXA.exec(parte);
    if (!m) {
      throw new Error(`int4multirange fora do formato: ${texto}`);
    }
    return { fim: Number(m[2]), inicio: Number(m[1]) };
  });
}

export const escreverMultirange = (faixas: readonly FaixaSeg[]): string =>
  `{${faixas.map((f) => `[${f.inicio},${f.fim})`).join(",")}}`;

/** Só select comum lê esta coluna pelo fromDriver; relational query devolve o texto cru. */
export const faixasDeSegundos = customType<{
  data: readonly FaixaSeg[];
  driverData: string;
}>({
  dataType: () => "int4multirange",
  fromDriver: lerMultirange,
  toDriver: escreverMultirange,
});
