import type { VideoId } from "@cursos/api/dominio/tipos";

import type {
  MotivoIndisponivel,
  OpcoesDoPlayer,
  PlayerDeVideo,
} from "./video";

// Só o que este adaptador usa da IFrame API documentada
// (https://developers.google.com/youtube/iframe_api_reference).
interface YtPlayer {
  destroy: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlaybackRate: () => number;
  mute: () => void;
  pauseVideo: () => void;
  playVideo: () => void;
  seekTo: (seg: number, permitirBuscaNoServidor: boolean) => void;
  setPlaybackRate: (taxa: number) => void;
  setVolume: (nivel: number) => void;
  unMute: () => void;
}

interface YtApi {
  Player: new (
    elemento: HTMLElement,
    opcoes: {
      events: {
        onError: (e: { data: number }) => void;
        onReady: () => void;
        onStateChange: (e: { data: number }) => void;
      };
      host: string;
      playerVars: Record<string, number | string>;
      videoId: string;
    }
  ) => YtPlayer;
}

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
    YT?: YtApi;
  }
}

let carregando: Promise<YtApi> | null = null;

/** Carrega o iframe_api uma vez por página. */
function carregarApi(): Promise<YtApi> {
  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }
  carregando ??= new Promise<YtApi>((resolve, reject) => {
    const anterior = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      anterior?.();
      if (window.YT) {
        resolve(window.YT);
      }
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => {
      carregando = null;
      reject(new Error("A IFrame API do YouTube não carregou."));
    };
    document.head.append(script);
  });
  return carregando;
}

const ESTADOS: Readonly<
  Record<number, "tocou" | "pausou" | "esperou" | "terminou">
> = { 0: "terminou", 1: "tocou", 2: "pausou", 3: "esperou" };

const motivoDoErro = (codigo: number): MotivoIndisponivel => {
  if (codigo === 100) {
    return "nao_encontrado";
  }
  return codigo === 101 || codigo === 150
    ? "sem_permissao_de_incorporar"
    : "outro";
};

/**
 * controls=0: os controles do app ficam abaixo do iframe, e nada fica por cima
 * dele (política do YouTube). A legenda segue o que o vídeo traz.
 */
export function criarPlayerDoYoutube(
  videoId: VideoId,
  elemento: HTMLElement,
  opcoes: OpcoesDoPlayer
): PlayerDeVideo {
  // instancia existe desde a criação; player, só depois do onReady.
  let instancia: YtPlayer | null = null;
  let player: YtPlayer | null = null;
  let destruido = false;
  const alvo = document.createElement("div");
  elemento.replaceChildren(alvo);

  carregarApi().then(
    (yt) => {
      if (destruido) {
        return;
      }
      const criado = new yt.Player(alvo, {
        events: {
          onError: (e) =>
            opcoes.aoEvento({ motivo: motivoDoErro(e.data), tipo: "falhou" }),
          onReady: () => {
            player = criado;
            criado.setVolume(opcoes.volume.nivel);
            if (opcoes.volume.mudo) {
              criado.mute();
            } else {
              criado.unMute();
            }
            criado.setPlaybackRate(opcoes.velocidade);
            opcoes.aoEvento({
              duracaoSeg: criado.getDuration(),
              tipo: "pronto",
            });
          },
          onStateChange: (e) => {
            const tipo = ESTADOS[e.data];
            if (tipo) {
              opcoes.aoEvento({ tipo });
            }
          },
        },
        host: "https://www.youtube-nocookie.com",
        playerVars: {
          controls: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          origin: window.location.origin,
          playsinline: 1,
          rel: 0,
          start: Math.floor(opcoes.inicioSeg),
        },
        videoId,
      });
      instancia = criado;
    },
    () => opcoes.aoEvento({ motivo: "outro", tipo: "falhou" })
  );

  return {
    buscar: (seg) => player?.seekTo(seg, true),
    definirMudo: (mudo) => (mudo ? player?.mute() : player?.unMute()),
    definirVelocidade: (v) => player?.setPlaybackRate(v),
    definirVolume: (nivel) => player?.setVolume(nivel),
    destruir: () => {
      destruido = true;
      instancia?.destroy();
      instancia = null;
      player = null;
    },
    pausar: () => player?.pauseVideo(),
    taxa: () => player?.getPlaybackRate() ?? opcoes.velocidade,
    tempo: () => player?.getCurrentTime() ?? opcoes.inicioSeg,
    tocar: () => player?.playVideo(),
  };
}
