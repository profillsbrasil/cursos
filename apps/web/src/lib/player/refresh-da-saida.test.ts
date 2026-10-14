import { describe, expect, test } from "bun:test";
import type { Conquista, Pedido } from "@cursos/api/dominio/registro";
import { SEM_TRECHOS } from "@cursos/api/dominio/trechos";

import { criarRefreshDaSaida } from "./refresh-da-saida";
import type { RespostaDoEnvio } from "./sessao";

const CONQUISTA: Conquista = {
  bonusSequencia: null,
  pontos: 10,
  sequenciaDias: 1,
};
const PEDIDO: Pedido = { posicaoSeg: 30, trechos: [] };

const aceito = (conquista: Conquista | null): RespostaDoEnvio => ({
  registro: {
    assistida: conquista !== null,
    cobertura: { pct: 0, vistosSeg: 0 },
    conquista,
    recusadosSeg: 0,
    trechos: SEM_TRECHOS,
  },
  tipo: "ok",
});

// Uma resposta de cada vez, na ordem da sessão: o enviar resolve e, com conquista,
// o aoConquistar roda logo depois.
function ligar() {
  const respostas: RespostaDoEnvio[] = [];
  const conquistas: Conquista[] = [];
  let refreshes = 0;
  const saida = criarRefreshDaSaida({
    aoConquistar: (c) => conquistas.push(c),
    enviar: () => {
      const r = respostas.shift();
      return r ? Promise.resolve(r) : Promise.reject(new Error("sem resposta"));
    },
    pedirRefresh: () => {
      refreshes += 1;
    },
  });
  async function responder(r: RespostaDoEnvio) {
    respostas.push(r);
    const recebida = await saida.enviar(PEDIDO);
    expect(recebida).toBe(r);
    if (recebida.tipo === "ok" && recebida.registro.conquista) {
      saida.aoConquistar(recebida.registro.conquista);
    }
  }
  return { conquistas, refreshes: () => refreshes, responder, saida };
}

describe("refresh da saída", () => {
  test("a conquista vale como refresh: a saída não pede outro", async () => {
    const { conquistas, refreshes, responder, saida } = ligar();
    await responder(aceito(null));
    await responder(aceito(CONQUISTA));
    expect(conquistas).toEqual([CONQUISTA]);
    expect(refreshes()).toBe(1);
    saida.aoEncerrar("assentou");
    expect(refreshes()).toBe(1);
  });

  test("envio aceito depois da conquista: a saída pede de novo", async () => {
    const { refreshes, responder, saida } = ligar();
    await responder(aceito(CONQUISTA));
    await responder(aceito(null));
    saida.aoEncerrar("assentou");
    expect(refreshes()).toBe(2);
  });

  test("só envio que falhou: a saída não pede refresh", async () => {
    const { refreshes, responder, saida } = ligar();
    await responder({ tipo: "rede" });
    await responder({ motivo: "sem_acesso", tipo: "definitivo" });
    saida.aoEncerrar("assentou");
    expect(refreshes()).toBe(0);
  });

  test("saída pelo teto não pede refresh, mesmo com envio aceito", async () => {
    const { refreshes, responder, saida } = ligar();
    await responder(aceito(null));
    saida.aoEncerrar("passou_do_teto");
    expect(refreshes()).toBe(0);
  });

  test("o erro do enviar passa adiante sem marcar nada", async () => {
    const { refreshes, saida } = ligar();
    await expect(saida.enviar(PEDIDO)).rejects.toThrow("sem resposta");
    saida.aoEncerrar("assentou");
    expect(refreshes()).toBe(0);
  });
});
