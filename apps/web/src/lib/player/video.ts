import type { Velocidade } from "@cursos/api/dominio/regras";
import type { VideoDaAula } from "@cursos/api/dominio/tipos";

import { criarPlayerDoYoutube } from "./youtube";

export type MotivoIndisponivel =
  | "nao_encontrado"
  | "sem_permissao_de_incorporar"
  | "outro";

export type EventoDoVideo =
  | { duracaoSeg: number; tipo: "pronto" }
  | { tipo: "tocou" }
  | { tipo: "pausou" }
  | { tipo: "esperou" }
  | { tipo: "terminou" }
  | { motivo: MotivoIndisponivel; tipo: "falhou" };

export interface Volume {
  mudo: boolean;
  /** 0 a 100. */
  nivel: number;
}

export interface PlayerDeVideo {
  buscar: (seg: number) => void;
  definirMudo: (mudo: boolean) => void;
  definirVelocidade: (v: Velocidade) => void;
  definirVolume: (nivel: number) => void;
  destruir: () => void;
  pausar: () => void;
  /** Segundo atual do vídeo, fracionário. */
  tempo: () => number;
  tocar: () => void;
  velocidade: () => number;
}

export interface OpcoesDoPlayer {
  aoEvento: (e: EventoDoVideo) => void;
  inicioSeg: number;
}

export function criarPlayerDeVideo(
  video: VideoDaAula,
  elemento: HTMLElement,
  opcoes: OpcoesDoPlayer
): PlayerDeVideo {
  switch (video.provedor) {
    case "youtube":
      return criarPlayerDoYoutube(video.id, elemento, opcoes);
    default: {
      const nenhum: never = video.provedor;
      throw new Error(`Provedor sem adaptador: ${String(nenhum)}`);
    }
  }
}
