import { quantizar, type Trecho } from "@cursos/api/dominio/trechos";

export interface Amostra {
  relogioMs: number;
  taxa: number;
  videoSeg: number;
}

/** Trecho em curso, em tempo fracionário do vídeo. Imutável. */
export interface Medidor {
  aberto: { inicioSeg: number; ultima: Amostra } | null;
}

export const MEDIDOR_PARADO: Medidor = { aberto: null };

export interface Medida {
  medidor: Medidor;
  /** Trechos fechados por esta chamada, já inteiros. */
  trechos: readonly Trecho[];
}

const FOLGA_MIN_SEG = 1;
const FOLGA_PROPORCIONAL = 0.25;
const RECUO_TOLERADO_SEG = 0.25;

const abrir = (a: Amostra): Medidor => ({
  aberto: { inicioSeg: a.videoSeg, ultima: a },
});

const trechoAte = (inicioSeg: number, fimSeg: number): Trecho[] => {
  const t = quantizar(inicioSeg, fimSeg);
  return t ? [t] : [];
};

/**
 * Estende o trecho aberto se o vídeo andou o que o relógio e a velocidade
 * explicam; senão fecha na amostra anterior e abre outro. Aba em segundo plano
 * com timer de 60 s ainda estende, porque o relógio explica o avanço.
 */
export function amostrar(m: Medidor, a: Amostra): Medida {
  if (!m.aberto) {
    return { medidor: abrir(a), trechos: [] };
  }
  const { inicioSeg, ultima } = m.aberto;
  const esperado = ((a.relogioMs - ultima.relogioMs) / 1000) * a.taxa;
  const andou = a.videoSeg - ultima.videoSeg;
  const salto =
    andou < -RECUO_TOLERADO_SEG ||
    andou > esperado + Math.max(FOLGA_MIN_SEG, esperado * FOLGA_PROPORCIONAL);
  if (salto) {
    return {
      medidor: abrir(a),
      trechos: trechoAte(inicioSeg, ultima.videoSeg),
    };
  }
  return { medidor: { aberto: { inicioSeg, ultima: a } }, trechos: [] };
}

/** Pausa, espera, fim ou busca: fecha o trecho aberto. */
export const fechar = (m: Medidor): Medida => ({
  medidor: MEDIDOR_PARADO,
  trechos: m.aberto
    ? trechoAte(m.aberto.inicioSeg, m.aberto.ultima.videoSeg)
    : [],
});

/**
 * Para o envio periódico: devolve o trecho aberto até o segundo inteiro da
 * última amostra e o reabre desse mesmo segundo, sem buraco entre envios.
 */
export function cortar(m: Medidor): Medida {
  if (!m.aberto) {
    return { medidor: m, trechos: [] };
  }
  const { inicioSeg, ultima } = m.aberto;
  const corte = Math.max(inicioSeg, Math.floor(ultima.videoSeg));
  return {
    medidor: { aberto: { inicioSeg: corte, ultima } },
    trechos: trechoAte(inicioSeg, ultima.videoSeg),
  };
}

/** O trecho aberto como trecho inteiro, para a barra desenhar sem fechar. */
export const trechoAberto = (m: Medidor): readonly Trecho[] =>
  m.aberto ? trechoAte(m.aberto.inicioSeg, m.aberto.ultima.videoSeg) : [];
