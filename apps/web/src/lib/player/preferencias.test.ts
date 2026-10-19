import { afterEach, describe, expect, test } from "bun:test";
import { SEM_TRECHOS } from "@cursos/api/dominio/trechos";

import {
  criarSessaoComPreferencias,
  PREFERENCIAS_PADRAO,
  type Preferencias,
  paraPreferencias,
} from "./preferencias";
import type { EventoDoVideo, PlayerDeVideo } from "./video";

describe("paraPreferencias", () => {
  test("sem nada guardado, o padrão", () => {
    expect(paraPreferencias(null)).toEqual(PREFERENCIAS_PADRAO);
  });

  test("a legenda nasce desligada", () => {
    expect(PREFERENCIAS_PADRAO.legenda).toBe(false);
  });

  test("lê o que a sessão gravou", () => {
    const guardado: Preferencias = {
      legenda: true,
      velocidade: 1.5,
      volume: { mudo: true, nivel: 35 },
    };
    expect(paraPreferencias(JSON.stringify(guardado))).toEqual(guardado);
  });

  test("o valor gravado antes da legenda mantém volume e velocidade, com a legenda desligada", () => {
    expect(
      paraPreferencias(
        JSON.stringify({ velocidade: 1.5, volume: { mudo: true, nivel: 35 } })
      )
    ).toEqual({
      legenda: false,
      velocidade: 1.5,
      volume: { mudo: true, nivel: 35 },
    });
  });

  test("valor fora da lista ou quebrado volta ao padrão", () => {
    expect(
      paraPreferencias(
        JSON.stringify({ velocidade: 3, volume: { mudo: false, nivel: 50 } })
      )
    ).toEqual(PREFERENCIAS_PADRAO);
    expect(
      paraPreferencias(
        JSON.stringify({ velocidade: 1, volume: { mudo: false, nivel: 150 } })
      )
    ).toEqual(PREFERENCIAS_PADRAO);
    expect(paraPreferencias("{")).toEqual(PREFERENCIAS_PADRAO);
  });
});

describe("sessão e preferências do aparelho", () => {
  const CHAVE = "cursos:player:preferencias";
  const semWindow = !("window" in globalThis);

  afterEach(() => {
    if (semWindow) {
      Reflect.deleteProperty(globalThis, "window");
    }
  });

  function montar(texto: string | null) {
    const armazenado = new Map<string, string>();
    if (texto !== null) {
      armazenado.set(CHAVE, texto);
    }
    const gravacoes: string[] = [];
    Object.assign(globalThis, {
      window: {
        localStorage: {
          getItem: (k: string) => armazenado.get(k) ?? null,
          setItem: (k: string, v: string) => {
            gravacoes.push(v);
            armazenado.set(k, v);
          },
        },
      },
    });
    const aplicado = { legenda: false, nivel: 100, velocidade: 1 };
    let emitir: (e: EventoDoVideo) => void = () => undefined;
    const player: PlayerDeVideo = {
      buscar: () => undefined,
      definirLegenda: (ligada) => {
        aplicado.legenda = ligada;
      },
      definirMudo: () => undefined,
      definirVelocidade: (v) => {
        aplicado.velocidade = v;
      },
      definirVolume: (n) => {
        aplicado.nivel = n;
      },
      destruir: () => undefined,
      pausar: () => undefined,
      tempo: () => 0,
      tocar: () => undefined,
      velocidade: () => aplicado.velocidade,
    };
    const { pararDeGravar, sessao } = criarSessaoComPreferencias(
      {
        duracaoSeg: 600,
        estudo: { assistida: false, trechos: SEM_TRECHOS },
        inicioSeg: 0,
      },
      {
        agendar: () => () => undefined,
        aoConquistar: () => undefined,
        criarPlayer: (o) => {
          emitir = o.aoEvento;
          return player;
        },
        enviar: () => new Promise(() => undefined),
        relogio: () => 0,
      }
    );
    return { aplicado, emitir, gravacoes, pararDeGravar, sessao };
  }

  const guardado: Preferencias = {
    legenda: true,
    velocidade: 1.5,
    volume: { mudo: false, nivel: 35 },
  };

  test("a sessão nasce com o que o aparelho guardou e o aplica no pronto", () => {
    const { aplicado, emitir, gravacoes, sessao } = montar(
      JSON.stringify(guardado)
    );
    expect(sessao.estado()).toMatchObject(guardado);
    emitir({ duracaoSeg: 600, tipo: "pronto" });
    expect(aplicado).toEqual({ legenda: true, nivel: 35, velocidade: 1.5 });
    expect(gravacoes).toEqual([]);
  });

  test("mudar volume, velocidade ou legenda grava no aparelho; parar de gravar desliga", () => {
    const { gravacoes, pararDeGravar, sessao } = montar(null);
    sessao.comandar({ tipo: "velocidade", valor: 2 });
    expect(paraPreferencias(gravacoes.at(-1) ?? null)).toEqual({
      legenda: false,
      velocidade: 2,
      volume: PREFERENCIAS_PADRAO.volume,
    });
    sessao.comandar({ nivel: 40, tipo: "definir_volume" });
    expect(paraPreferencias(gravacoes.at(-1) ?? null)).toEqual({
      legenda: false,
      velocidade: 2,
      volume: { mudo: false, nivel: 40 },
    });
    sessao.comandar({ tipo: "legenda" });
    expect(paraPreferencias(gravacoes.at(-1) ?? null)).toEqual({
      legenda: true,
      velocidade: 2,
      volume: { mudo: false, nivel: 40 },
    });
    const antes = gravacoes.length;
    pararDeGravar();
    sessao.comandar({ tipo: "velocidade", valor: 1.25 });
    expect(gravacoes).toHaveLength(antes);
  });
});
