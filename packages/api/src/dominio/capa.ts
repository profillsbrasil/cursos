// O que é uma capa aceitável, sem ler bytes: o editor confere o arquivo antes de
// enviar, e externos/capas.ts confere de novo no servidor.

export const LIMITE_DA_CAPA = {
  /** Corpo de função na Vercel vai até 4,5 MB; sobra espaço para o documento. */
  bytes: 4 * 1024 * 1024,
  ladoMaximo: 8000,
  /** O banner mostra a capa a 44vw; abaixo disso ela fica borrada. */
  larguraMinima: 640,
} as const;

export type RecusaDaCapa =
  | { tipo: "formato" }
  | { tipo: "pesada"; limiteMb: number }
  | { tipo: "estreita"; larguraMinima: number }
  | { tipo: "enorme"; ladoMaximo: number }
  | { tipo: "desligado" };

/** A capa guardada no Storage. A URL sai do sha256 dos bytes: identifica a imagem. */
export interface ImagemDaCapa {
  altura: number;
  largura: number;
  url: string;
}

export function recusaDoTamanho(bytes: number): RecusaDaCapa | null {
  return bytes > LIMITE_DA_CAPA.bytes
    ? { limiteMb: LIMITE_DA_CAPA.bytes / 1024 / 1024, tipo: "pesada" }
    : null;
}

/** A medida já com a orientação EXIF aplicada. */
export function recusaDaMedida(
  largura: number,
  altura: number
): RecusaDaCapa | null {
  if (altura < 1) {
    return { tipo: "formato" };
  }
  if (largura < LIMITE_DA_CAPA.larguraMinima) {
    return { larguraMinima: LIMITE_DA_CAPA.larguraMinima, tipo: "estreita" };
  }
  if (Math.max(largura, altura) > LIMITE_DA_CAPA.ladoMaximo) {
    return { ladoMaximo: LIMITE_DA_CAPA.ladoMaximo, tipo: "enorme" };
  }
  return null;
}
