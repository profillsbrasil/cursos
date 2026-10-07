import { describe, expect, test } from "bun:test";
import {
  aplicarRegistro,
  type Conquista,
  type Cota,
  type EstudoSalvo,
  type Pedido,
} from "@cursos/api/dominio/registro";
import {
  canonizar,
  cobertura,
  SEM_TRECHOS,
  segundos,
  type Trecho,
} from "@cursos/api/dominio/trechos";

import { PREFERENCIAS_PADRAO } from "./preferencias";
import {
  criarSessaoDeEstudo,
  type EstadoReproducao,
  motivoParadoDe,
  type RespostaDoEnvio,
  transicao,
} from "./sessao";
import type { EventoDoVideo, OpcoesDoPlayer, PlayerDeVideo } from "./video";

const DURACAO = 600;

function relogioFalso() {
  let agora = 0;
  let seq = 0;
  const fila = new Map<number, { em: number; fn: () => void }>();
  const flush = () => new Promise((r) => setImmediate(r));
  async function avancar(ms: number): Promise<void> {
    // Respostas já resolvidas agendam timers em microtask: elas rodam antes da varredura.
    await flush();
    const fim = agora + ms;
    let proximo: [number, { em: number; fn: () => void }] | null = null;
    for (const item of fila) {
      if (item[1].em <= fim && (!proximo || item[1].em < proximo[1].em)) {
        proximo = item;
      }
    }
    if (!proximo) {
      agora = fim;
      await flush();
      return;
    }
    fila.delete(proximo[0]);
    agora = proximo[1].em;
    proximo[1].fn();
    await flush();
    return avancar(fim - agora);
  }
  return {
    agendar(fn: () => void, ms: number) {
      seq += 1;
      const id = seq;
      fila.set(id, { em: agora + ms, fn });
      return () => {
        fila.delete(id);
      };
    },
    agora: () => agora,
    avancar,
    flush,
  };
}

type Relogio = ReturnType<typeof relogioFalso>;

function playerFalso(relogio: Relogio) {
  let base = 0;
  let desde = 0;
  let taxa = 1;
  let tocando = false;
  let pronto = false;
  // Como o YouTube: antes do onReady, volume e velocidade não chegam ao player.
  const aplicado = { mudo: false, nivel: 100, velocidade: 1 };
  let aoEvento: (e: EventoDoVideo) => void = () => undefined;
  const tempo = () =>
    tocando
      ? Math.min(DURACAO, base + ((relogio.agora() - desde) / 1000) * taxa)
      : base;
  const player: PlayerDeVideo = {
    // Como o YouTube: busca com o vídeo tocando passa por buffer (3) e volta a tocar (1).
    buscar(seg) {
      base = seg;
      desde = relogio.agora();
      if (tocando) {
        aoEvento({ tipo: "esperou" });
        aoEvento({ tipo: "tocou" });
      }
    },
    definirMudo(mudo) {
      if (pronto) {
        aplicado.mudo = mudo;
      }
    },
    definirVelocidade(v) {
      if (!pronto) {
        return;
      }
      base = tempo();
      desde = relogio.agora();
      taxa = v;
      aplicado.velocidade = v;
    },
    definirVolume(nivel) {
      if (pronto) {
        aplicado.nivel = nivel;
      }
    },
    destruir: () => undefined,
    pausar() {
      if (tocando) {
        base = tempo();
        tocando = false;
        aoEvento({ tipo: "pausou" });
      }
    },
    taxa: () => taxa,
    tempo,
    tocar() {
      if (!tocando) {
        desde = relogio.agora();
        tocando = true;
        aoEvento({ tipo: "tocou" });
      }
    },
  };
  return {
    aplicado,
    criar(o: OpcoesDoPlayer) {
      ({ aoEvento } = o);
      base = o.inicioSeg;
      return player;
    },
    emitir(e: EventoDoVideo) {
      pronto ||= e.tipo === "pronto";
      aoEvento(e);
    },
    terminar() {
      base = DURACAO;
      tocando = false;
      aoEvento({ tipo: "terminou" });
    },
  };
}

/** Roda aplicarRegistro de verdade, com o relógio falso. */
function servidorFalso(relogio: Relogio) {
  let salvo: EstudoSalvo = {
    assistida: false,
    duracaoSeg: DURACAO,
    trechos: SEM_TRECHOS,
  };
  let cota: Cota | null = null;
  const pedidos: (Pedido & { emMs: number })[] = [];
  let falha: RespostaDoEnvio | null = null;
  return {
    coberturaSeg: () => segundos(salvo.trechos),
    enviar(p: Pedido): Promise<RespostaDoEnvio> {
      pedidos.push({ ...p, emMs: relogio.agora() });
      if (falha) {
        return Promise.resolve(falha);
      }
      const r = aplicarRegistro(salvo, cota, p, new Date(relogio.agora()));
      salvo = {
        ...salvo,
        assistida: salvo.assistida || r.viraAssistida,
        trechos: r.trechos,
      };
      ({ cota } = r);
      return Promise.resolve({
        registro: {
          assistida: salvo.assistida,
          cobertura: cobertura(r.trechos, DURACAO),
          conquista: r.viraAssistida
            ? { bonusSequencia: null, pontos: 10, sequenciaDias: 1 }
            : null,
          recusadosSeg: r.recusadosSeg,
          trechos: r.trechos,
        },
        tipo: "ok",
      });
    },
    falhar(r: RespostaDoEnvio | null) {
      falha = r;
    },
    pedidos,
    trechos: () => salvo.trechos,
  };
}

function montar(
  inicioSeg = 0,
  { preferencias = PREFERENCIAS_PADRAO, pronto = true } = {}
) {
  const relogio = relogioFalso();
  const video = playerFalso(relogio);
  const servidor = servidorFalso(relogio);
  const conquistas: Conquista[] = [];
  const sessao = criarSessaoDeEstudo(
    {
      duracaoSeg: DURACAO,
      estudo: { assistida: false, trechos: SEM_TRECHOS },
      inicioSeg,
      preferencias,
    },
    {
      agendar: relogio.agendar,
      aoConquistar: (c) => conquistas.push(c),
      criarPlayer: (o) => video.criar(o),
      enviar: (p) => servidor.enviar(p),
      relogio: relogio.agora,
    }
  );
  const ficarPronto = () =>
    video.emitir({ duracaoSeg: DURACAO + 0.6, tipo: "pronto" });
  if (pronto) {
    ficarPronto();
  }
  return { conquistas, ficarPronto, relogio, servidor, sessao, video };
}

const t = (inicio: number, fim: number): Trecho => ({ fim, inicio });

describe("sessão de estudo", () => {
  test("tocar de 0 a 540 a 1x envia a cada 15 s e dá uma conquista", async () => {
    const { conquistas, relogio, servidor, sessao } = montar();
    sessao.comandar({ tipo: "alternar" });
    await relogio.avancar(540_000);
    await relogio.flush();
    expect(servidor.coberturaSeg()).toBeGreaterThanOrEqual(540);
    expect(conquistas).toEqual([
      { bonusSequencia: null, pontos: 10, sequenciaDias: 1 },
    ]);
    const intervalos = servidor.pedidos
      .slice(1, 30)
      .map((p, i) => p.emMs - (servidor.pedidos[i]?.emMs ?? 0));
    expect(new Set(intervalos)).toEqual(new Set([15_000]));
    expect(sessao.estado().assistida).toBe(true);
  });

  test("a conquista sai na hora em que a cobertura local cruza 90%", async () => {
    const { conquistas, relogio, sessao } = montar();
    // Pausar 1 s desloca os envios periódicos para 6 + 15k s; a cobertura cruza
    // 540 em 541 s, longe de qualquer envio periódico.
    sessao.comandar({ tipo: "alternar" });
    await relogio.avancar(5000);
    sessao.comandar({ tipo: "alternar" });
    await relogio.avancar(1000);
    sessao.comandar({ tipo: "alternar" });
    await relogio.avancar(534_000);
    expect(conquistas).toHaveLength(0);
    await relogio.avancar(1000);
    expect(conquistas).toHaveLength(1);
  });

  test("busca não pinta o que ficou para trás", async () => {
    const { relogio, servidor, sessao } = montar();
    sessao.comandar({ tipo: "alternar" });
    await relogio.avancar(30_000);
    sessao.comandar({ seg: 300, tipo: "saltar" });
    await relogio.avancar(30_000);
    sessao.comandar({ tipo: "alternar" });
    await relogio.flush();
    expect(servidor.trechos()).toEqual(
      canonizar([t(0, 30), t(330, 360)], DURACAO)
    );
    expect(sessao.estado().trechos).toEqual(servidor.trechos());
  });

  test("falha de rede reenvia os mesmos trechos", async () => {
    const { relogio, servidor, sessao } = montar();
    servidor.falhar({ tipo: "rede" });
    sessao.comandar({ tipo: "alternar" });
    await relogio.avancar(20_000);
    sessao.comandar({ tipo: "alternar" });
    await relogio.flush();
    expect(sessao.estado().envio.tipo).toBe("esperando_nova_tentativa");
    const tentados = servidor.pedidos.flatMap((p) => p.trechos);
    servidor.falhar(null);
    await relogio.avancar(60_000);
    expect(servidor.trechos()).toEqual(canonizar(tentados, DURACAO));
    expect(servidor.coberturaSeg()).toBe(20);
    expect(sessao.estado().envio.tipo).toBe("em_dia");
  });

  test("erro definitivo para o envio, e o vídeo segue", async () => {
    const { relogio, servidor, sessao } = montar();
    servidor.falhar({ motivo: "sem_acesso", tipo: "definitivo" });
    sessao.comandar({ tipo: "alternar" });
    await relogio.avancar(16_000);
    const antes = servidor.pedidos.length;
    await relogio.avancar(60_000);
    expect(sessao.estado().envio).toEqual({
      motivo: "sem_acesso",
      tipo: "parado",
    });
    expect(servidor.pedidos.length).toBe(antes);
    expect(sessao.estado().reproducao.tipo).toBe("tocando");
  });

  test("o fim grava a posição no último segundo", async () => {
    const { relogio, servidor, sessao, video } = montar(580);
    sessao.comandar({ tipo: "alternar" });
    await relogio.avancar(20_000);
    video.terminar();
    await relogio.flush();
    expect(servidor.pedidos.at(-1)?.posicaoSeg).toBe(DURACAO);
  });

  test("parado, buscar grava só a posição 1,5 s depois", async () => {
    const { relogio, servidor, sessao } = montar();
    sessao.comandar({ seg: 120, tipo: "buscar" });
    await relogio.avancar(1000);
    expect(servidor.pedidos).toHaveLength(0);
    await relogio.avancar(600);
    expect(servidor.pedidos.map((p) => [p.posicaoSeg, p.trechos])).toEqual([
      [120, []],
    ]);
  });

  test("o que a cota cortou fica pendente e volta no envio seguinte", async () => {
    const { relogio, servidor, sessao } = montar();
    // 150 s a 2x sem rede juntam 300 s pendentes; o primeiro envio que passa
    // leva 180 (balde cheio) e a cota corta 120.
    servidor.falhar({ tipo: "rede" });
    sessao.comandar({ tipo: "velocidade", valor: 2 });
    sessao.comandar({ tipo: "alternar" });
    await relogio.avancar(150_000);
    sessao.comandar({ tipo: "alternar" });
    servidor.falhar(null);
    await relogio.avancar(60_000);
    const primeiroOk = servidor.pedidos.find(
      (p) => segundos(p.trechos) === 300
    );
    expect(primeiroOk).toBeDefined();
    await relogio.avancar(120_000);
    expect(servidor.coberturaSeg()).toBe(300);
    expect(sessao.estado().envio.tipo).toBe("em_dia");
  });

  test("salvarAgora manda mesmo com outro envio em voo", async () => {
    const { relogio, servidor, sessao } = montar();
    sessao.comandar({ tipo: "alternar" });
    await relogio.avancar(10_000);
    sessao.salvarAgora();
    sessao.salvarAgora();
    expect(servidor.pedidos).toHaveLength(2);
  });

  test("encerrar fecha o trecho, envia e não agenda mais nada", async () => {
    const { relogio, servidor, sessao } = montar();
    sessao.comandar({ tipo: "alternar" });
    await relogio.avancar(8000);
    sessao.encerrar();
    await relogio.avancar(60_000);
    expect(servidor.pedidos).toHaveLength(1);
    expect(servidor.trechos()).toEqual(canonizar([t(0, 8)], DURACAO));
  });
});

describe("envio sem mudança", () => {
  test("abrir e sair sem tocar não envia nada", async () => {
    const { relogio, servidor, sessao } = montar(120);
    await relogio.avancar(5000);
    sessao.encerrar();
    await relogio.flush();
    expect(servidor.pedidos).toHaveLength(0);
  });

  test("trocar de aba com o vídeo parado não envia", async () => {
    const { relogio, servidor, sessao } = montar(120);
    sessao.salvarAgora();
    await relogio.avancar(2000);
    sessao.salvarAgora();
    await relogio.avancar(2000);
    sessao.salvarAgora();
    await relogio.flush();
    expect(servidor.pedidos).toHaveLength(0);
  });

  test("depois de um envio confirmado, sair parado no mesmo ponto não reenvia", async () => {
    const { relogio, servidor, sessao } = montar();
    sessao.comandar({ tipo: "alternar" });
    await relogio.avancar(8000);
    sessao.comandar({ tipo: "alternar" });
    await relogio.avancar(1000);
    expect(servidor.pedidos).toHaveLength(1);
    sessao.salvarAgora();
    sessao.encerrar();
    await relogio.flush();
    expect(servidor.pedidos).toHaveLength(1);
  });
});

describe("nova tentativa", () => {
  test("voltar à posição confirmada durante a espera devolve o envio a em dia", async () => {
    const { relogio, servidor, sessao } = montar();
    servidor.falhar({ tipo: "rede" });
    sessao.comandar({ seg: 120, tipo: "buscar" });
    await relogio.avancar(1600);
    expect(sessao.estado().envio.tipo).toBe("esperando_nova_tentativa");
    sessao.comandar({ seg: 0, tipo: "buscar" });
    await relogio.avancar(1600);
    expect(sessao.estado().envio).toEqual({ tipo: "em_dia" });
    sessao.comandar({ seg: 200, tipo: "buscar" });
    await relogio.avancar(1600);
    expect(sessao.estado().envio).toEqual({
      tentativa: 1,
      tipo: "esperando_nova_tentativa",
    });
  });

  test("a nova tentativa em voo carrega quantas falharam antes", async () => {
    const { relogio, servidor, sessao } = montar();
    const vistos: unknown[] = [];
    sessao.assinar(() => {
      const { envio } = sessao.estado();
      if (JSON.stringify(vistos.at(-1)) !== JSON.stringify(envio)) {
        vistos.push(envio);
      }
    });
    servidor.falhar({ tipo: "rede" });
    sessao.comandar({ seg: 120, tipo: "buscar" });
    await relogio.avancar(1600);
    servidor.falhar(null);
    await relogio.avancar(60_000);
    expect(vistos).toEqual([
      { tipo: "em_dia" },
      { tentativa: 0, tipo: "enviando" },
      { tentativa: 1, tipo: "esperando_nova_tentativa" },
      { tentativa: 1, tipo: "enviando" },
      { tipo: "em_dia" },
    ]);
  });
});

describe("cadência do envio", () => {
  test("saltar com o vídeo tocando não envia na hora", async () => {
    const { relogio, servidor, sessao } = montar();
    sessao.comandar({ tipo: "alternar" });
    await relogio.avancar(300);
    sessao.comandar({ seg: 10, tipo: "saltar" });
    await relogio.avancar(300);
    sessao.comandar({ seg: 10, tipo: "saltar" });
    await relogio.avancar(300);
    sessao.comandar({ seg: 10, tipo: "saltar" });
    await relogio.avancar(300);
    expect(servidor.pedidos).toHaveLength(0);
    await relogio.avancar(15_000);
    expect(servidor.pedidos).toHaveLength(1);
  });

  test("buffer fecha o trecho sem enviar; o periódico leva", async () => {
    const { relogio, servidor, sessao, video } = montar();
    sessao.comandar({ tipo: "alternar" });
    await relogio.avancar(5000);
    video.emitir({ tipo: "esperou" });
    await relogio.flush();
    expect(servidor.pedidos).toHaveLength(0);
    video.emitir({ tipo: "tocou" });
    await relogio.avancar(10_000);
    expect(servidor.pedidos).toHaveLength(1);
  });
});

describe("volume e velocidade", () => {
  test("o que mudou antes do pronto chega ao player no pronto", () => {
    const { ficarPronto, sessao, video } = montar(0, { pronto: false });
    sessao.comandar({ nivel: 20, tipo: "definir_volume" });
    sessao.comandar({ tipo: "mudo" });
    sessao.comandar({ tipo: "velocidade", valor: 1.5 });
    ficarPronto();
    expect(video.aplicado).toEqual({ mudo: true, nivel: 20, velocidade: 1.5 });
  });

  test("a sessão nasce com a preferência do aparelho e a aplica no pronto", () => {
    const { sessao, video } = montar(0, {
      preferencias: { velocidade: 1.25, volume: { mudo: false, nivel: 40 } },
    });
    expect(sessao.estado().velocidade).toBe(1.25);
    expect(sessao.estado().volume).toEqual({ mudo: false, nivel: 40 });
    expect(video.aplicado).toEqual({
      mudo: false,
      nivel: 40,
      velocidade: 1.25,
    });
  });
});

describe("encerrar com a rede caída", () => {
  test("não tenta de novo depois de encerrar", async () => {
    const { relogio, servidor, sessao } = montar();
    servidor.falhar({ tipo: "rede" });
    sessao.comandar({ tipo: "alternar" });
    await relogio.avancar(8000);
    sessao.encerrar();
    await relogio.avancar(120_000);
    expect(servidor.pedidos).toHaveLength(1);
  });

  test("a conquista que chega no envio de saída ainda é avisada", async () => {
    const { conquistas, relogio, servidor, sessao } = montar();
    sessao.comandar({ tipo: "alternar" });
    await relogio.avancar(530_000);
    servidor.falhar({ tipo: "rede" });
    await relogio.avancar(11_000);
    expect(conquistas).toHaveLength(0);
    servidor.falhar(null);
    sessao.encerrar();
    await relogio.flush();
    expect(servidor.coberturaSeg()).toBeGreaterThanOrEqual(540);
    expect(conquistas).toHaveLength(1);
  });
});

describe("motivoParadoDe", () => {
  test("recusa do servidor para o envio; só o desconhecido tenta de novo", () => {
    expect(motivoParadoDe("NOT_FOUND")).toBe("sem_acesso");
    expect(motivoParadoDe("FORBIDDEN")).toBe("sem_acesso");
    expect(motivoParadoDe("BAD_REQUEST")).toBe("envio_recusado");
    expect(motivoParadoDe("INTERNAL_SERVER_ERROR")).toBeUndefined();
  });
});

describe("transicao", () => {
  const de = (tipo: Exclude<EstadoReproducao["tipo"], "indisponivel">) =>
    ({ tipo }) as EstadoReproducao;

  test("cada evento leva ao estado nomeado", () => {
    expect(
      transicao(de("carregando"), { duracaoSeg: 600, tipo: "pronto" })
    ).toEqual(de("pronto"));
    expect(transicao(de("pronto"), { tipo: "tocou" })).toEqual(de("tocando"));
    expect(transicao(de("tocando"), { tipo: "pausou" })).toEqual(de("pausado"));
    expect(transicao(de("tocando"), { tipo: "esperou" })).toEqual(
      de("esperando")
    );
    expect(transicao(de("tocando"), { tipo: "terminou" })).toEqual(
      de("terminou")
    );
  });

  test("pronto só sai de carregando, e indisponível não sai", () => {
    expect(
      transicao(de("tocando"), { duracaoSeg: 600, tipo: "pronto" })
    ).toEqual(de("tocando"));
    const fora = transicao(de("tocando"), {
      motivo: "nao_encontrado",
      tipo: "falhou",
    });
    expect(fora).toEqual({ motivo: "nao_encontrado", tipo: "indisponivel" });
    expect(transicao(fora, { tipo: "tocou" })).toEqual(fora);
  });
});
