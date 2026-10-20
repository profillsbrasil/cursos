import { describe, expect, mock, test } from "bun:test";

let aberto: {
  contentType: string;
  nomeDoArquivo: string;
  resposta: Response;
} | null = null;

mock.module("@/server/api", () => ({
  abrirMaterial: () => Promise.resolve(aberto),
}));

const { GET } = await import("@/app/material/[id]/route");

const baixar = () =>
  GET(new Request("http://localhost/material/x"), {
    params: Promise.resolve({ id: "x" }),
  });

describe("a rota do material de apoio", () => {
  test("quem pode ver baixa o arquivo como anexo, com o nome original, e nada fica em cache", async () => {
    aberto = {
      contentType: "application/pdf",
      nomeDoArquivo: "Checklist técnico.pdf",
      resposta: new Response("%PDF-1.7", {
        headers: { "content-length": "8" },
      }),
    };
    const r = await baixar();
    expect([
      r.status,
      r.headers.get("content-type"),
      r.headers.get("content-disposition"),
      r.headers.get("cache-control"),
      r.headers.get("content-length"),
      await r.text(),
    ]).toEqual([
      200,
      "application/pdf",
      "attachment; filename=\"Checklist tecnico.pdf\"; filename*=UTF-8''Checklist%20t%C3%A9cnico.pdf",
      "private, no-store",
      "8",
      "%PDF-1.7",
    ]);
  });

  test("quem não pode ver, ou o id que não existe, recebe 404 sem corpo", async () => {
    aberto = null;
    const r = await baixar();
    expect([r.status, await r.text()]).toEqual([404, ""]);
  });
});
