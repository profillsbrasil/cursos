import type { Conquista, Pedido, Registro } from "@cursos/api/dominio/registro";
import { TRECHOS_POR_ENVIO, type Velocidade } from "@cursos/api/dominio/regras";
import {
  atingiuMeta,
  type Cobertura,
  canonizar,
  cobertura,
  SEM_TRECHOS,
  segundos,
  subtrair,
  type Trecho,
  type Trechos,
  unir,
} from "@cursos/api/dominio/trechos";

import {
  amostrar,
  cortar,
  fechar,
  MEDIDOR_PARADO,
  type Medida,
  type Medidor,
  trechoAberto,
} from "./medidor";
import type { Preferencias } from "./preferencias";
import type {
  EventoDoVideo,
  MotivoIndisponivel,
  OpcoesDoPlayer,
  PlayerDeVideo,
  Volume,
} from "./video";

export type EstadoReproducao =
  | { tipo: "carregando" }
  | { tipo: "pronto" }
  | { tipo: "tocando" }
  | { tipo: "pausado" }
  | { tipo: "esperando" }
  | { tipo: "terminou" }
  | { motivo: MotivoIndisponivel; tipo: "indisponivel" };

export type MotivoParado =
  | "envio_recusado"
  | "sem_acesso"
  | "sem_video"
  | "sessao_expirada";

const PARADO_POR: Readonly<Record<string, MotivoParado>> = {
  BAD_REQUEST: "envio_recusado",
  FORBIDDEN: "sem_acesso",
  NOT_FOUND: "sem_acesso",
  PRECONDITION_FAILED: "sem_video",
  UNAUTHORIZED: "sessao_expirada",
};

export const motivoParadoDe = (codigo: string): MotivoParado | undefined =>
  PARADO_POR[codigo];

export type EstadoEnvio =
  | { tipo: "em_dia" }
  | { tipo: "pendente" }
  | { tentativa: number; tipo: "enviando" }
  | { tentativa: number; tipo: "esperando_nova_tentativa" }
  | { motivo: MotivoParado; tipo: "parado" };

export type Comando =
  | { tipo: "alternar" }
  | { seg: number; tipo: "buscar" }
  | { seg: number; tipo: "saltar" }
  | { tipo: "velocidade"; valor: Velocidade }
  | { delta: number; tipo: "volume" }
  | { nivel: number; tipo: "definir_volume" }
  | { tipo: "mudo" };

export interface EstadoDaSessao {
  assistida: boolean;
  cobertura: Cobertura;
  duracaoSeg: number;
  envio: EstadoEnvio;
  reproducao: EstadoReproducao;
  tempoSeg: number;
  trechos: Trechos;
  velocidade: Velocidade;
  volume: Volume;
}

export type RegistroNoFio = Omit<Registro, "trechos"> & {
  trechos: readonly Trecho[];
};

export type RespostaDoEnvio =
  | { registro: RegistroNoFio; tipo: "ok" }
  | { motivo: MotivoParado; tipo: "definitivo" }
  | { tipo: "rede" };

export interface DependenciasDaSessao {
  agendar: (fn: () => void, ms: number) => () => void;
  aoConquistar: (c: Conquista) => void;
  criarPlayer: (o: OpcoesDoPlayer) => PlayerDeVideo;
  enviar: (pedido: Pedido) => Promise<RespostaDoEnvio>;
  relogio: () => number;
}

export interface EntradaDaSessao {
  duracaoSeg: number;
  estudo: { assistida: boolean; trechos: Trechos };
  inicioSeg: number;
  preferencias: Preferencias;
}

export interface SessaoDeEstudo {
  assinar: (ouvinte: () => void) => () => void;
  comandar: (c: Comando) => void;
  encerrar: () => void;
  estado: () => EstadoDaSessao;
  salvarAgora: () => void;
}

export const AMOSTRA_MS = 250;
export const ENVIO_MS = 15_000;
export const POSICAO_PARADA_MS = 1500;
const NOVA_TENTATIVA_MS = 2000;
const NOVA_TENTATIVA_MAX_MS = 60_000;
const DIFERENCA_DE_DURACAO_SEG = 2;

export function transicao(
  e: EstadoReproducao,
  ev: EventoDoVideo
): EstadoReproducao {
  if (e.tipo === "indisponivel") {
    return e;
  }
  switch (ev.tipo) {
    case "falhou":
      return { motivo: ev.motivo, tipo: "indisponivel" };
    case "pronto":
      return e.tipo === "carregando" ? { tipo: "pronto" } : e;
    case "tocou":
      return { tipo: "tocando" };
    case "pausou":
      return { tipo: "pausado" };
    case "esperou":
      return { tipo: "esperando" };
    case "terminou":
      return { tipo: "terminou" };
    default: {
      const nenhum: never = ev;
      return nenhum;
    }
  }
}

export const estadoInicial = (e: EntradaDaSessao): EstadoDaSessao => ({
  assistida: e.estudo.assistida,
  cobertura: cobertura(e.estudo.trechos, e.duracaoSeg),
  duracaoSeg: e.duracaoSeg,
  envio: { tipo: "em_dia" },
  reproducao: { tipo: "carregando" },
  tempoSeg: e.inicioSeg,
  trechos: e.estudo.trechos,
  velocidade: e.preferencias.velocidade,
  volume: e.preferencias.volume,
});

const limitar = (n: number, min: number, max: number) =>
  Math.min(Math.max(n, min), max);

export function criarSessaoDeEstudo(
  entrada: EntradaDaSessao,
  deps: DependenciasDaSessao
): SessaoDeEstudo {
  const { duracaoSeg } = entrada;
  let foto = estadoInicial(entrada);
  let { assistida, envio, reproducao, tempoSeg, velocidade, volume } = foto;
  let servidor = foto.trechos;
  let pendentes: Trechos = SEM_TRECHOS;
  let medidor: Medidor = MEDIDOR_PARADO;
  const posicaoDe = (seg: number) => Math.floor(limitar(seg, 0, duracaoSeg));
  let posicaoEnviada = posicaoDe(entrada.inicioSeg);
  let pediuNaMeta = false;
  let encerrada = false;
  let tentativa = 0;
  let pararAmostra: (() => void) | null = null;
  let pararEnvio: (() => void) | null = null;
  const ouvintes = new Set<() => void>();

  const vistos = () =>
    unir(
      servidor,
      canonizar([...pendentes, ...trechoAberto(medidor)], duracaoSeg)
    );

  function fotografar(): EstadoDaSessao {
    const trechos = vistos();
    return {
      assistida,
      cobertura: cobertura(trechos, duracaoSeg),
      duracaoSeg,
      envio,
      reproducao,
      tempoSeg,
      trechos,
      velocidade,
      volume,
    };
  }
  function avisar() {
    foto = fotografar();
    for (const o of ouvintes) {
      o();
    }
  }

  const guardar = (m: Medida) => {
    ({ medidor } = m);
    if (m.trechos.length > 0) {
      pendentes = canonizar([...pendentes, ...m.trechos], duracaoSeg);
    }
  };

  const amostra = () => ({
    relogioMs: deps.relogio(),
    taxa: player.taxa(),
    videoSeg: player.tempo(),
  });

  function medirAgora() {
    const a = amostra();
    tempoSeg = a.videoSeg;
    guardar(amostrar(medidor, a));
  }

  function fecharTrecho() {
    if (medidor.aberto) {
      medirAgora();
    }
    guardar(fechar(medidor));
  }

  function agendarEnvio(ms: number) {
    pararEnvio?.();
    pararEnvio = deps.agendar(() => {
      pararEnvio = null;
      if (reproducao.tipo === "tocando") {
        guardar(cortar(medidor));
      }
      enviar(false);
    }, ms);
  }

  const temNovidade = () =>
    pendentes.length > 0 || posicaoDe(tempoSeg) !== posicaoEnviada;

  function aposResposta(r: RespostaDoEnvio, pedido: Pedido) {
    if (encerrada) {
      if (r.tipo === "ok" && r.registro.conquista) {
        deps.aoConquistar(r.registro.conquista);
      }
      return;
    }
    if (r.tipo === "definitivo") {
      envio = { motivo: r.motivo, tipo: "parado" };
      pararEnvio?.();
      avisar();
      return;
    }
    if (r.tipo === "rede") {
      tentativa += 1;
      envio = { tentativa, tipo: "esperando_nova_tentativa" };
      agendarEnvio(
        Math.min(
          NOVA_TENTATIVA_MS * 2 ** (tentativa - 1),
          NOVA_TENTATIVA_MAX_MS
        )
      );
      avisar();
      return;
    }
    tentativa = 0;
    posicaoEnviada = pedido.posicaoSeg;
    servidor = unir(servidor, canonizar(r.registro.trechos, duracaoSeg));
    pendentes = subtrair(pendentes, servidor);
    assistida = assistida || r.registro.assistida;
    if (r.registro.conquista) {
      deps.aoConquistar(r.registro.conquista);
    }
    const resta = temNovidade();
    envio = resta ? { tipo: "pendente" } : { tipo: "em_dia" };
    if ((resta || reproducao.tipo === "tocando") && !pararEnvio) {
      agendarEnvio(ENVIO_MS);
    }
    avisar();
  }

  function enviar(mesmoEmVoo: boolean) {
    if (envio.tipo === "parado" || (envio.tipo === "enviando" && !mesmoEmVoo)) {
      return;
    }
    if (!temNovidade()) {
      if (envio.tipo !== "enviando" && envio.tipo !== "em_dia") {
        tentativa = 0;
        envio = { tipo: "em_dia" };
        avisar();
      }
      return;
    }
    pararEnvio?.();
    pararEnvio = null;
    const pedido: Pedido = {
      posicaoSeg: posicaoDe(tempoSeg),
      trechos: pendentes.slice(0, TRECHOS_POR_ENVIO),
    };
    envio = { tentativa, tipo: "enviando" };
    avisar();
    deps.enviar(pedido).then(
      (r) => aposResposta(r, pedido),
      () => aposResposta({ tipo: "rede" }, pedido)
    );
  }

  function cruzouAMeta() {
    if (assistida || pediuNaMeta) {
      return;
    }
    if (atingiuMeta(segundos(vistos()), duracaoSeg)) {
      pediuNaMeta = true;
      guardar(cortar(medidor));
      enviar(false);
    }
  }

  function tique() {
    pararAmostra = deps.agendar(() => {
      if (reproducao.tipo !== "tocando") {
        pararAmostra = null;
        return;
      }
      medirAgora();
      cruzouAMeta();
      avisar();
      tique();
    }, AMOSTRA_MS);
  }

  function aoFicarPronto(duracaoDoVideoSeg: number) {
    player.definirVolume(volume.nivel);
    player.definirMudo(volume.mudo);
    player.definirVelocidade(velocidade);
    if (Math.abs(duracaoDoVideoSeg - duracaoSeg) > DIFERENCA_DE_DURACAO_SEG) {
      console.warn(
        `duração do vídeo (${duracaoDoVideoSeg} s) difere da aula (${duracaoSeg} s)`
      );
    }
  }

  function aoComecarATocar() {
    ({ medidor } = amostrar(MEDIDOR_PARADO, amostra()));
    pararAmostra?.();
    tique();
    if (!pararEnvio) {
      agendarEnvio(ENVIO_MS);
    }
  }

  function aoPararDeTocar(depois: EstadoReproducao) {
    pararAmostra?.();
    pararAmostra = null;
    fecharTrecho();
    if (depois.tipo === "terminou") {
      tempoSeg = duracaoSeg;
    }
    if (depois.tipo !== "esperando") {
      enviar(false);
    }
  }

  function aoEvento(ev: EventoDoVideo) {
    if (encerrada) {
      return;
    }
    const antes = reproducao.tipo;
    const depois = transicao(reproducao, ev);
    reproducao = depois;
    if (ev.tipo === "pronto") {
      aoFicarPronto(ev.duracaoSeg);
    } else if (depois.tipo === "tocando" && antes !== "tocando") {
      aoComecarATocar();
    } else if (antes === "tocando" && depois.tipo !== "tocando") {
      aoPararDeTocar(depois);
    }
    avisar();
  }

  const player = deps.criarPlayer({ aoEvento, inicioSeg: entrada.inicioSeg });

  function mover(seg: number) {
    const destino = limitar(seg, 0, duracaoSeg);
    fecharTrecho();
    player.buscar(destino);
    tempoSeg = destino;
    if (reproducao.tipo === "tocando") {
      ({ medidor } = amostrar(MEDIDOR_PARADO, {
        relogioMs: deps.relogio(),
        taxa: player.taxa(),
        videoSeg: destino,
      }));
    } else {
      agendarEnvio(POSICAO_PARADA_MS);
    }
  }

  function definirVolume(nivel: number) {
    const novo = limitar(Math.round(nivel), 0, 100);
    player.definirVolume(novo);
    if (volume.mudo && novo > 0) {
      player.definirMudo(false);
    }
    volume = { mudo: volume.mudo && novo === 0, nivel: novo };
  }

  function comandar(c: Comando) {
    if (encerrada) {
      return;
    }
    switch (c.tipo) {
      case "alternar":
        if (reproducao.tipo === "tocando") {
          player.pausar();
        } else {
          player.tocar();
        }
        break;
      case "buscar":
        mover(c.seg);
        break;
      case "saltar":
        mover(
          (reproducao.tipo === "tocando" ? player.tempo() : tempoSeg) + c.seg
        );
        break;
      case "velocidade":
        if (medidor.aberto) {
          medirAgora();
        }
        player.definirVelocidade(c.valor);
        velocidade = c.valor;
        break;
      case "volume":
        definirVolume(volume.nivel + c.delta);
        break;
      case "definir_volume":
        definirVolume(c.nivel);
        break;
      case "mudo":
        player.definirMudo(!volume.mudo);
        volume = { ...volume, mudo: !volume.mudo };
        break;
      default: {
        const nenhum: never = c;
        throw new Error(`Comando sem tratamento: ${JSON.stringify(nenhum)}`);
      }
    }
    avisar();
  }

  function salvarAgora() {
    if (reproducao.tipo === "tocando") {
      medirAgora();
      guardar(cortar(medidor));
    }
    enviar(true);
  }

  return {
    assinar(ouvinte) {
      ouvintes.add(ouvinte);
      return () => ouvintes.delete(ouvinte);
    },
    comandar,
    encerrar() {
      if (encerrada) {
        return;
      }
      if (reproducao.tipo === "tocando") {
        fecharTrecho();
      }
      enviar(true);
      encerrada = true;
      pararAmostra?.();
      pararEnvio?.();
      player.destruir();
    },
    estado: () => foto,
    salvarAgora,
  };
}
