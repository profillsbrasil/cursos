import { describe, expect, test } from "bun:test";
import { SidebarProvider } from "@cursos/ui/components/sidebar";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  ProvedorDaCasca,
  useAlternarNavegacao,
  useModoDaCasca,
} from "./provedor-da-casca";

function UsaAlternar() {
  useAlternarNavegacao();
  return <span>alterna</span>;
}

function MostraModo() {
  const { noCelular, recolhida } = useModoDaCasca();
  return <span>{`celular=${noCelular} recolhida=${recolhida}`}</span>;
}

const renderizar = (arvore: ReactNode) => () => renderToStaticMarkup(arvore);

// Antes, a checagem morava no callback do clique: um consumidor fora do
// ProvedorDaCasca renderizava normal e só quebrava quando alguém clicava.
describe("useAlternarNavegacao exige o ProvedorDaCasca", () => {
  test("dentro de um SidebarProvider sem a casca, lança na renderização", () => {
    expect(
      renderizar(
        <SidebarProvider>
          <UsaAlternar />
        </SidebarProvider>
      )
    ).toThrow("useAlternarNavegacao fora do ProvedorDaCasca.");
  });

  test("dentro do ProvedorDaCasca, renderiza", () => {
    expect(
      renderizar(
        <ProvedorDaCasca aberta>
          <UsaAlternar />
        </ProvedorDaCasca>
      )()
    ).toContain("<span>alterna</span>");
  });
});

describe("useModoDaCasca lê o modo do cookie no servidor", () => {
  test("aberta", () => {
    expect(
      renderizar(
        <ProvedorDaCasca aberta>
          <MostraModo />
        </ProvedorDaCasca>
      )()
    ).toContain("celular=false recolhida=false");
  });

  test("recolhida", () => {
    expect(
      renderizar(
        <ProvedorDaCasca aberta={false}>
          <MostraModo />
        </ProvedorDaCasca>
      )()
    ).toContain("celular=false recolhida=true");
  });
});
