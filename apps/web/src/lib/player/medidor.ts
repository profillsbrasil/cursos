import { quantizar, type Trecho } from "@cursos/api/dominio/trechos";

export interface Amostra {
  relogioMs: number;
  taxa: number;
  videoSeg: number;
}

export interface Medidor {
  readonly aberto: { inicioSeg: number; ultima: Amostra } | null;
}

export const MEDIDOR_PARADO: Medidor = { aberto: null };

export interface Medida {
  medidor: Medidor;
  trechos: readonly Trecho[];
}

const FOLGA_MIN_SEG = 1;
const FOLGA_PROPORCIONAL = 0.25;
const RECUO_TOLERADO_SEG = 0.25;

const abrir = (a: Amostra) => ({
  aberto: { inicioSeg: a.videoSeg, ultima: a },
});

const trechoAte = (inicioSeg: number, fimSeg: number) => {
  const t = quantizar(inicioSeg, fimSeg);

  return t ? [t] : [];
};

export function amostrar(m: Medidor, a: Amostra) {
  if (!m.aberto) {
    const medida: Medida = { medidor: abrir(a), trechos: [] };

    return medida;
  }

  const { inicioSeg, ultima } = m.aberto;
  const esperado = ((a.relogioMs - ultima.relogioMs) / 1000) * a.taxa;
  const andou = a.videoSeg - ultima.videoSeg;

  const salto =
    andou < -RECUO_TOLERADO_SEG ||
    andou > esperado + Math.max(FOLGA_MIN_SEG, esperado * FOLGA_PROPORCIONAL);

  if (salto) {
    const medida: Medida = {
      medidor: abrir(a),
      trechos: trechoAte(inicioSeg, ultima.videoSeg),
    };

    return medida;
  }

  const medida: Medida = {
    medidor: { aberto: { inicioSeg, ultima: a } },
    trechos: [],
  };

  return medida;
}

export const fechar = (m: Medidor) => {
  const medida: Medida = {
    medidor: MEDIDOR_PARADO,
    trechos: m.aberto
      ? trechoAte(m.aberto.inicioSeg, m.aberto.ultima.videoSeg)
      : [],
  };

  return medida;
};

export function cortar(m: Medidor) {
  if (!m.aberto) {
    const medida: Medida = { medidor: m, trechos: [] };

    return medida;
  }

  const { inicioSeg, ultima } = m.aberto;
  const corte = Math.max(inicioSeg, Math.floor(ultima.videoSeg));

  const medida: Medida = {
    medidor: { aberto: { inicioSeg: corte, ultima } },
    trechos: trechoAte(inicioSeg, ultima.videoSeg),
  };

  return medida;
}

export const trechoAberto = (m: Medidor) => {
  const retorno: readonly Trecho[] = m.aberto
    ? trechoAte(m.aberto.inicioSeg, m.aberto.ultima.videoSeg)
    : [];

  return retorno;
};
