import { describe, expect, test } from "bun:test";

import { respostaDoMaterial } from "./resposta-do-material";

describe("a resposta do download do material de apoio", () => {
  test("quem pode ver baixa o arquivo como anexo, com o nome original, e nada fica em cache", async () => {
    const r = respostaDoMaterial({
      contentType: "application/pdf",
      nomeDoArquivo: "Checklist técnico.pdf",
      resposta: new Response("%PDF-1.7", {
        headers: { "content-length": "8" },
      }),
    });
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
    const r = respostaDoMaterial(null);
    expect([r.status, await r.text()]).toEqual([404, ""]);
  });
});
