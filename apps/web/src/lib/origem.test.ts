import { describe, expect, test } from "bun:test";

import { recusaDeOrigem } from "./origem";

const ORIGEM = "http://localhost:3001";
const URL_DO_TRPC = `${ORIGEM}/api/trpc/admin.catalogo.salvarCurso`;

function pedido(cabecalhos: Record<string, string>, corpo: BodyInit) {
  return new Request(URL_DO_TRPC, {
    body: corpo,
    headers: cabecalhos,
    method: "POST",
  });
}

const formulario = () => {
  const fd = new FormData();
  fd.set("documento", "{}");
  return fd;
};

describe("recusaDeOrigem", () => {
  test("multipart de outro site é recusado com 403", () => {
    const resposta = recusaDeOrigem(
      pedido({ origin: "https://outro.site" }, formulario()),
      ORIGEM
    );
    expect(resposta?.status).toBe(403);
  });

  test("multipart sem Origin é recusado", () => {
    expect(recusaDeOrigem(pedido({}, formulario()), ORIGEM)?.status).toBe(403);
  });

  test("multipart da própria origem passa", () => {
    expect(
      recusaDeOrigem(pedido({ origin: ORIGEM }, formulario()), ORIGEM)
    ).toBeNull();
  });

  test("JSON passa por aqui sem conferência: o preflight do CORS já barra", () => {
    expect(
      recusaDeOrigem(
        pedido(
          { "content-type": "application/json", origin: "https://outro.site" },
          "{}"
        ),
        ORIGEM
      )
    ).toBeNull();
  });
});
