import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { type ClerkNoNavegador, setClerkAuthTokenGetter } from "./clerk-auth";
import { clienteTrpc } from "./trpc";

const VOLTAS_DE_MICROTAREFA = 100;

const AULA = "0b5f7f4e-6a43-4a0e-9a4f-3c8a6d1b2c3d";

interface Pedido {
  headers: Record<string, string>;
  keepalive: boolean | undefined;
  url: RequestInfo | URL | string;
}

const original = {
  Clerk: "Clerk" in globalThis ? globalThis.Clerk : undefined,
  temWindow: "window" in globalThis,
  window: "window" in globalThis ? globalThis.window : undefined,
};

let pedidos: Pedido[] = [];

function clerkComUltimoToken(raw: string, venceEmSeg: number) {
  const exp = Math.floor(Date.now() / 1000) + venceEmSeg;

  const clerk: ClerkNoNavegador = {
    session: {
      lastActiveToken: { getRawString: () => raw, jwt: { claims: { exp } } },
    },
  };

  Reflect.set(globalThis, "Clerk", clerk);
}

const getTokenEsperandoARede = () =>
  new Promise<string | null>(() => undefined);

const cliente = clienteTrpc((url, init) => {
  pedidos.push({
    headers: Object.fromEntries(new Headers(init.headers)),
    keepalive: init.keepalive,
    url,
  });

  return new Promise<Response>(() => undefined);
});

function registrar() {
  cliente.aula.registrar
    .mutate({ aulaId: AULA, posicaoSeg: 42, trechos: [] })
    .catch(() => undefined);
}

const microtarefas = (voltas: number): Promise<void> =>
  voltas === 0 || pedidos.length > 0
    ? Promise.resolve()
    : Promise.resolve().then(() => microtarefas(voltas - 1));

async function pedidoDentroDaTarefa() {
  await microtarefas(VOLTAS_DE_MICROTAREFA);

  return pedidos[0];
}

beforeEach(() => {
  pedidos = [];
  Reflect.set(globalThis, "window", globalThis);
});

afterEach(() => {
  // WARNING: sem window antes, apague-o: com window undefined, o "window" in globalThis de outro teste acha que há window.
  if (original.temWindow) {
    Reflect.set(globalThis, "window", original.window);
  } else {
    Reflect.deleteProperty(globalThis, "window");
  }

  Reflect.set(globalThis, "Clerk", original.Clerk);
  setClerkAuthTokenGetter(null);
});

describe("envio de aula.registrar no pagehide", () => {
  test("sai com o último token do Clerk sem esperar a renovação pela rede", async () => {
    clerkComUltimoToken("token-com-3s", 3);
    setClerkAuthTokenGetter(getTokenEsperandoARede);

    registrar();
    const pedido = await pedidoDentroDaTarefa();

    expect(pedido?.url ?? "nenhum pedido saiu").toContain("aula.registrar");
    expect(pedido?.keepalive).toBe(true);
    expect(pedido?.headers.authorization).toBe("Bearer token-com-3s");
  });

  test("com o último token vencido, espera o getToken", async () => {
    clerkComUltimoToken("token-vencido", -1);
    setClerkAuthTokenGetter(() => Promise.resolve("token-renovado"));

    registrar();
    const pedido = await pedidoDentroDaTarefa();

    expect(pedido?.headers.authorization).toBe("Bearer token-renovado");
  });

  test("sem o clerk-js carregado, espera o getToken", async () => {
    setClerkAuthTokenGetter(() => Promise.resolve("token-do-getter"));

    registrar();
    const pedido = await pedidoDentroDaTarefa();

    expect(pedido?.headers.authorization).toBe("Bearer token-do-getter");
  });
});
