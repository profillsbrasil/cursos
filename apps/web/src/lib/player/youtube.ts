import type { VideoId } from "@cursos/api/dominio/tipos";
import { preconnect, preload } from "react-dom";

import type {
  MotivoIndisponivel,
  OpcoesDoPlayer,
  PlayerDeVideo,
} from "./video";

interface YtPlayer {
  destroy: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlaybackRate: () => number;
  loadModule: (modulo: "captions") => void;
  mute: () => void;
  pauseVideo: () => void;
  playVideo: () => void;
  seekTo: (seg: number, permitirBuscaNoServidor: boolean) => void;
  setPlaybackRate: (taxa: number) => void;
  setVolume: (nivel: number) => void;
  unloadModule: (modulo: "captions") => void;
  unMute: () => void;
}

interface YtApi {
  Player: new (
    elemento: HTMLElement,
    opcoes: {
      events: {
        onApiChange: () => void;
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

const API_DO_YOUTUBE = "https://www.youtube.com/iframe_api";
const HOST_DO_PLAYER = "https://www.youtube-nocookie.com";

/**
 * Chamada no render da página da aula, põe no HTML a conexão com as três origens
 * do player e o pedido da IFrame API, que o cliente só injetaria depois de
 * hidratar. O i.ytimg.com serve o pôster do vídeo.
 */
export function adiantarOYoutube(): void {
  preconnect("https://www.youtube.com");
  preconnect(HOST_DO_PLAYER);
  preconnect("https://i.ytimg.com");
  preload(API_DO_YOUTUBE, { as: "script" });
}

let carregando: Promise<YtApi> | null = null;

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
    script.src = API_DO_YOUTUBE;
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

// WARNING: o unloadModule dispara outro onApiChange; o eco dentro desta janela não reaplica a legenda, senão vira laço.
const ECO_DA_LEGENDA_MS = 1000;

const motivoDoErro = (codigo: number): MotivoIndisponivel => {
  if (codigo === 100) {
    return "nao_encontrado";
  }

  return codigo === 101 || codigo === 150
    ? "sem_permissao_de_incorporar"
    : "outro";
};

export function criarPlayerDoYoutube(
  videoId: VideoId,
  elemento: HTMLElement,
  opcoes: OpcoesDoPlayer
): PlayerDeVideo {
  let instancia: YtPlayer | null = null;
  let playerPronto: YtPlayer | null = null;
  let destruido = false;
  let legenda = false;
  let reaplicouEm = Number.NEGATIVE_INFINITY;
  let comecou = false;
  let posicaoAntesDoPlay: number | null = null;

  const aplicarPosicaoAntesDoPlay = () => {
    if (posicaoAntesDoPlay !== null) {
      playerPronto?.seekTo(posicaoAntesDoPlay, true);
      posicaoAntesDoPlay = null;
    }
  };

  const alvo = document.createElement("div");
  elemento.replaceChildren(alvo);

  // WARNING: o YouTube ignora o unloadModule chamado antes de o módulo de legenda carregar; reaplique a escolha a cada módulo e a cada play.
  const aplicarLegenda = () => {
    if (legenda) {
      playerPronto?.loadModule("captions");
    } else {
      playerPronto?.unloadModule("captions");
    }
  };

  carregarApi().then(
    (yt) => {
      if (destruido) {
        return;
      }

      const criado = new yt.Player(alvo, {
        events: {
          onApiChange: () => {
            const agora = performance.now();

            if (agora - reaplicouEm < ECO_DA_LEGENDA_MS) {
              return;
            }

            reaplicouEm = agora;
            aplicarLegenda();
          },
          onError: (e) =>
            opcoes.aoEvento({ motivo: motivoDoErro(e.data), tipo: "falhou" }),
          onReady: () => {
            playerPronto = criado;
            opcoes.aoEvento({
              duracaoSeg: criado.getDuration(),
              tipo: "pronto",
            });
          },
          onStateChange: (e) => {
            const tipo = ESTADOS[e.data];

            if (tipo && !comecou) {
              comecou = true;
              aplicarPosicaoAntesDoPlay();
            }

            if (tipo === "tocou") {
              aplicarLegenda();
            }

            if (tipo) {
              opcoes.aoEvento({ tipo });
            }
          },
        },
        host: HOST_DO_PLAYER,
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

      elemento.querySelector("iframe")?.setAttribute("tabindex", "-1");
      instancia = criado;
    },
    () => opcoes.aoEvento({ motivo: "outro", tipo: "falhou" })
  );

  return {
    buscar: (seg) => {
      if (comecou) {
        playerPronto?.seekTo(seg, true);
      } else {
        posicaoAntesDoPlay = seg;
      }
    },
    definirLegenda: (ligada) => {
      legenda = ligada;
      aplicarLegenda();
    },
    definirMudo: (mudo) =>
      mudo ? playerPronto?.mute() : playerPronto?.unMute(),
    definirVelocidade: (v) => playerPronto?.setPlaybackRate(v),
    definirVolume: (nivel) => playerPronto?.setVolume(nivel),
    destruir: () => {
      destruido = true;
      instancia?.destroy();
      instancia = null;
      playerPronto = null;
    },
    pausar: () => playerPronto?.pauseVideo(),
    tempo: () =>
      posicaoAntesDoPlay ?? playerPronto?.getCurrentTime() ?? opcoes.inicioSeg,
    tocar: () => {
      aplicarPosicaoAntesDoPlay();
      playerPronto?.playVideo();
    },
    velocidade: () => playerPronto?.getPlaybackRate() ?? 1,
  };
}
