import { VELOCIDADES, type Velocidade } from "@cursos/api/dominio/regras";

import {
  criarSessaoDeEstudo,
  type DependenciasDaSessao,
  type EntradaDaSessao,
  type SessaoDeEstudo,
} from "./sessao";
import type { Volume } from "./video";

export interface Preferencias {
  legenda: boolean;
  velocidade: Velocidade;
  volume: Volume;
}

export const PREFERENCIAS_PADRAO: Preferencias = {
  legenda: false,
  velocidade: 1,
  volume: { mudo: false, nivel: 100 },
};

const CHAVE = "cursos:player:preferencias";

const objeto = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === "object" && valor !== null;

// Checagem à mão: o Zod levaria cerca de 90 KB em gzip ao cliente da aula.
function paraVolume(valor: unknown): Volume | null {
  if (!objeto(valor)) {
    return null;
  }
  const { mudo, nivel } = valor;
  return typeof mudo === "boolean" &&
    typeof nivel === "number" &&
    Number.isInteger(nivel) &&
    nivel >= 0 &&
    nivel <= 100
    ? { mudo, nivel }
    : null;
}

export function paraPreferencias(texto: string | null): Preferencias {
  if (texto === null) {
    return PREFERENCIAS_PADRAO;
  }
  let lido: unknown;
  try {
    lido = JSON.parse(texto);
  } catch {
    return PREFERENCIAS_PADRAO;
  }
  if (!objeto(lido)) {
    return PREFERENCIAS_PADRAO;
  }
  // O valor gravado antes da legenda existir não tem o campo, e continua valendo.
  const legenda = lido.legenda ?? false;
  const velocidade = VELOCIDADES.find((v) => v === lido.velocidade);
  const volume = paraVolume(lido.volume);
  return typeof legenda === "boolean" && velocidade !== undefined && volume
    ? { legenda, velocidade, volume }
    : PREFERENCIAS_PADRAO;
}

export function lerPreferencias(): Preferencias {
  try {
    return paraPreferencias(window.localStorage.getItem(CHAVE));
  } catch {
    return PREFERENCIAS_PADRAO;
  }
}

export function gravarPreferencias(p: Preferencias): void {
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(p));
  } catch {
    // Sem armazenamento, a preferência dura só esta aula.
  }
}

export function criarSessaoComPreferencias(
  entrada: Omit<EntradaDaSessao, "preferencias">,
  deps: DependenciasDaSessao
): { pararDeGravar: () => void; sessao: SessaoDeEstudo } {
  let gravadas = lerPreferencias();
  const sessao = criarSessaoDeEstudo(
    { ...entrada, preferencias: gravadas },
    deps
  );
  const pararDeGravar = sessao.assinar(() => {
    const { legenda, velocidade, volume } = sessao.estado();
    if (
      legenda !== gravadas.legenda ||
      velocidade !== gravadas.velocidade ||
      volume !== gravadas.volume
    ) {
      gravadas = { legenda, velocidade, volume };
      gravarPreferencias(gravadas);
    }
  });
  return { pararDeGravar, sessao };
}
