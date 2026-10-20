// O notFound() da ficha, do acesso e do editor cai no not-found.tsx do admin,
// dentro da casca e com a volta para as telas do admin, e a aba diz o mesmo
// que o h1. O Next só troca o título da aba quando o generateMetadata chama
// notFound().

import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { spawnSync } from "bun";
import { renderToStaticMarkup } from "react-dom/server";

const naoEncontrado = await import("./not-found");

const sonda = spawnSync(
  ["bun", join(import.meta.dir, "titulo-nao-encontrado.sonda.ts")],
  { cwd: join(import.meta.dir, "../../../../..") }
);
const titulos = JSON.parse(sonda.stdout.toString() || "{}") as Record<
  "acesso" | "editor" | "ficha",
  unknown
>;

const H1 = /<h1[^>]*>([^<]*)<\/h1>/;
const HREF = /href="([^"]*)"/g;

const Tela = naoEncontrado.default;
const html = renderToStaticMarkup(<Tela />);

describe("a 404 do admin", () => {
  test("a sonda roda", () => {
    expect({ erro: sonda.stderr.toString(), saida: sonda.exitCode }).toEqual({
      erro: "",
      saida: 0,
    });
  });

  test("pessoa, acesso e curso inexistentes: o generateMetadata chama notFound()", () => {
    expect(titulos).toEqual({
      acesso: "notFound()",
      editor: "notFound()",
      ficha: "notFound()",
    });
  });

  test("o título da aba é o h1, com o sufixo do admin", () => {
    const h1 = H1.exec(html)?.[1];
    expect(naoEncontrado.metadata?.title).toBe(`${h1} · Admin`);
  });

  test("leva às telas do admin, não a Meus cursos", () => {
    const destinos = [...html.matchAll(HREF)].map((m) => m[1]);
    expect(destinos).toEqual(["/admin/pessoas", "/admin/catalogo"]);
  });
});
