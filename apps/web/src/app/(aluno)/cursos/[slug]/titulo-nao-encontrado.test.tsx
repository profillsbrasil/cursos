import { describe, expect, test } from "bun:test";
import { join } from "node:path";

import { spawnSync } from "bun";
import type { Metadata } from "next";
import { renderToStaticMarkup } from "react-dom/server";

import { ehRegistro } from "@/components/predicados.test-utils";

const paginaNaoEncontrada = await import("../../../not-found");
const aulaNaoEncontrada = await import("./aulas/[aulaId]/not-found");
const cursoNaoEncontrado = await import("./not-found");

const sonda = spawnSync(
  ["bun", join(import.meta.dir, "titulo-nao-encontrado.sonda.ts")],
  { cwd: join(import.meta.dir, "../../../../..") }
);

const lido: unknown = JSON.parse(sonda.stdout.toString() || "{}");
const titulos = ehRegistro(lido) ? lido : {};

const H1 = /<h1[^>]*>([^<]*)<\/h1>/;

function doNaoEncontrado(modulo: {
  default: () => React.ReactElement;
  metadata?: Metadata;
}) {
  const Tela = modulo.default;

  return {
    h1: H1.exec(renderToStaticMarkup(<Tela />))?.[1],
    titulo: modulo.metadata?.title,
  };
}

describe("a aba diz o que a página não achou", () => {
  test("a sonda roda", () => {
    expect({ erro: sonda.stderr.toString(), saida: sonda.exitCode }).toEqual({
      erro: "",
      saida: 0,
    });
  });

  test("aula inexistente: a página cai no not-found, e o título é o dele", () => {
    expect(titulos.aula).toBe("notFound()");
    expect(doNaoEncontrado(aulaNaoEncontrada)).toEqual({
      h1: "Aula não encontrada",
      titulo: "Aula não encontrada",
    });
  });

  test("curso inexistente ou fechado: a página cai no not-found, e o título é o dele", () => {
    expect(titulos.curso).toBe("notFound()");
    expect(doNaoEncontrado(cursoNaoEncontrado)).toEqual({
      h1: "Curso não encontrado",
      titulo: "Curso não encontrado",
    });
  });

  test("certificado de curso fechado: o título vem do not-found do curso, não Seu certificado", () => {
    expect(titulos.certificado).toBe("notFound()");
  });

  test("endereço que não existe: o título é o do not-found do app", () => {
    expect(doNaoEncontrado(paginaNaoEncontrada)).toEqual({
      h1: "Página não encontrada",
      titulo: "Página não encontrada",
    });
  });
});
