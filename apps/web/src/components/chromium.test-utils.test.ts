import { afterAll, describe, expect, test } from "bun:test";

import { pedidosDoDevTools } from "./chromium.test-utils";

let recebidas = 0;

const servidor = Bun.serve({
  fetch: (pedido, s) =>
    s.upgrade(pedido) ? undefined : new Response(null, { status: 426 }),
  port: 0,
  websocket: {
    message: (ws) => {
      recebidas += 1;
      ws.send(
        JSON.stringify(
          recebidas === 1
            ? { id: "um" }
            : { id: recebidas, result: { ok: true } }
        )
      );
    },
  },
});

const ws = await new Promise<WebSocket>((pronto, falhou) => {
  const aberto = new WebSocket(`ws://127.0.0.1:${servidor.port}`);
  aberto.addEventListener("open", () => pronto(aberto));
  aberto.addEventListener("error", () =>
    falhou(new Error("o WebSocket não abriu"))
  );
});

afterAll(async () => {
  ws.close();
  await servidor.stop(true);
});

describe("pedidosDoDevTools", () => {
  test("a mensagem fora do protocolo recusa o pedido pendente na hora", async () => {
    const pedir = pedidosDoDevTools(ws);

    await expect(pedir("Page.enable", {})).rejects.toThrow(
      "o DevTools mandou uma mensagem fora do protocolo"
    );
    expect(await pedir("Page.enable", {})).toEqual({ ok: true });
  });
});
