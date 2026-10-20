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
  // loadModule e unloadModule ficam fora da referência pública. Com controls: 0 o
  // botão de legenda some, e eles são o único jeito de ligar e desligar a legenda.
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

// O próprio unloadModule dispara outro onApiChange: o que chega nesta janela depois
// de reaplicar a legenda é o eco da chamada, e reaplicar de novo seria um laço.
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
  const alvo = document.createElement("div");
  elemento.replaceChildren(alvo);

  // O YouTube carrega o módulo de legenda quando o vídeo começa a tocar e ignora o
  // unloadModule chamado antes: a escolha volta a cada módulo carregado e a cada play.
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
            if (tipo === "tocou") {
              aplicarLegenda();
            }
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
      // A barra do app tem os controles, e as 7 paradas de Tab do pôster do YouTube
      // (em inglês) vinham antes dela. O clique no vídeo continua indo ao iframe.
      elemento.querySelector("iframe")?.setAttribute("tabindex", "-1");
      instancia = criado;
    },
    () => opcoes.aoEvento({ motivo: "outro", tipo: "falhou" })
  );

  return {
    buscar: (seg) => playerPronto?.seekTo(seg, true),
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
    tempo: () => playerPronto?.getCurrentTime() ?? opcoes.inicioSeg,
    tocar: () => playerPronto?.playVideo(),
    velocidade: () => playerPronto?.getPlaybackRate() ?? 1,
  };
}
