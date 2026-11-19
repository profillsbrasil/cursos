import { describe, expect, test } from "bun:test";

import type { ComunicadoNaTela } from "@cursos/api/dominio/comunicado";
import { comunicadoId } from "@cursos/api/dominio/marcas";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ComRoteador, roteadorDeTeste } from "@/components/roteador.test-utils";

import { Comunicados } from "./comunicados";

const { chamadas, roteador } = roteadorDeTeste();

const renderizar = (no: ReactNode) =>
  renderToStaticMarkup(<ComRoteador roteador={roteador}>{no}</ComRoteador>);

const TAG = /<[^>]+>/g;
const texto = (html: string) => html.replace(TAG, " ").replace(/\s+/g, " ");

const comunicado = (
  id: string,
  publicadoPor: string | null
): ComunicadoNaTela => ({
  curso: null,
  id: comunicadoId(id),
  publicadoEm: "2026-10-01T12:00:00.000Z",
  publicadoPor,
  texto: "Texto",
  titulo: `Comunicado ${id}`,
});

describe("autor na lista de publicados", () => {
  const tela = texto(
    renderizar(
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

describe("onde o aluno lê o comunicado", () => {
  test("a tela não repete Meus cursos: o cabeçalho da página já diz onde ele aparece", () => {
    const vazia = texto(
      renderizar(<Comunicados comunicados={[]} cursos={[]} />)
    );

    expect(vazia).toContain(
      "Novo comunicado Para todos ou para quem tem um curso"
    );
    expect(vazia).toContain("Nenhum comunicado ainda.");
    expect(vazia).not.toContain("Meus cursos");
  });
});

test("renderizar não chama o roteador: nada navega no HTML do servidor", () => {
  expect(chamadas).toEqual([]);
});
