// O Next só troca o título da aba pelo do not-found.tsx quando o generateMetadata
// chama notFound(); se ele devolve um título, a aba fica com esse título, mesmo com a
// página no not-found.

import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { spawnSync } from "bun";
import type { Metadata } from "next";
import { renderToStaticMarkup } from "react-dom/server";

// O módulo inteiro, para ler o metadata que pode faltar.
const paginaNaoEncontrada = await import("../../../not-found");
const aulaNaoEncontrada = await import("./aulas/[aulaId]/not-found");
const cursoNaoEncontrado = await import("./not-found");

// As páginas leem pelo @/server/api, que outro arquivo de teste troca por um módulo
// com menos funções; depois que um módulo trocado é ligado, o bun não acrescenta
// funções a ele. A sonda roda num processo próprio, com o seu @/server/api.
const sonda = spawnSync(
  ["bun", join(import.meta.dir, "titulo-nao-encontrado.sonda.ts")],
  { cwd: join(import.meta.dir, "../../../../..") }
);
const titulos = JSON.parse(sonda.stdout.toString() || "{}") as Record<
  "aula" | "certificado" | "curso",
  unknown
>;

const H1 = /<h1[^>]*>([^<]*)<\/h1>/;

/** O título do not-found.tsx e o h1 que ele desenha, que devem ser o mesmo. */
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

  // O certificado não tem not-found próprio: cai no do curso, "Curso não encontrado".
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
