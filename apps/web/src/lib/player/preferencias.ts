import { VELOCIDADES, type Velocidade } from "@cursos/api/dominio/regras";
import { z } from "zod";

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

// O valor gravado antes da legenda existir não tem o campo, e continua valendo.
const formato = z.object({
  legenda: z.boolean().default(false),
  velocidade: z.literal(VELOCIDADES),
  volume: z.object({ mudo: z.boolean(), nivel: z.int().min(0).max(100) }),
});

export function paraPreferencias(texto: string | null): Preferencias {
  if (texto === null) {
    return PREFERENCIAS_PADRAO;
  }
  try {
    const lido = formato.safeParse(JSON.parse(texto));
    return lido.success ? lido.data : PREFERENCIAS_PADRAO;
  } catch {
    return PREFERENCIAS_PADRAO;
  }
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
