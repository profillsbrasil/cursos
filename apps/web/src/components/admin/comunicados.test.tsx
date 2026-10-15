import { describe, expect, mock, test } from "bun:test";
import type { ComunicadoNaTela } from "@cursos/api/dominio/comunicado";
import type { ComunicadoId } from "@cursos/api/dominio/tipos";
import { renderToStaticMarkup } from "react-dom/server";

// Fora do App Router o useRouter lança; o resto do módulo fica o de verdade.
const navegacao = await import("next/navigation");
mock.module("next/navigation", () => ({
  ...navegacao,
  useRouter: () => ({
    push: () => undefined,
    refresh: () => undefined,
    replace: () => undefined,
  }),
}));

const { Comunicados } = await import("./comunicados");

const TAG = /<[^>]+>/g;
const texto = (html: string) => html.replace(TAG, " ").replace(/\s+/g, " ");

const comunicado = (
  id: string,
  publicadoPor: string | null
): ComunicadoNaTela => ({
  curso: null,
  id: id as ComunicadoId,
  publicadoEm: "2026-10-01T12:00:00.000Z",
  publicadoPor,
  texto: "Texto",
  titulo: `Comunicado ${id}`,
});

describe("autor na lista de publicados", () => {
  const tela = texto(
    renderToStaticMarkup(
      <Comunicados
        comunicados={[comunicado("a", "Dona do admin"), comunicado("b", null)]}
        cursos={[]}
      />
    )
  );

  test("com autor conhecido, a linha diz a data e quem publicou", () => {
    expect(tela).toContain("1 de outubro de 2026, por Dona do admin");
  });

  test("sem autor, a linha diz só a data", () => {
    expect(tela).toContain(
      "Comunicado b Todos os alunos 1 de outubro de 2026 "
    );
    expect(tela).not.toContain("por user_");
    expect(tela).not.toContain("por null");
    expect(tela.match(/, por /g)).toHaveLength(1);
  });
});
