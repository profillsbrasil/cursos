import { describe, expect, test } from "bun:test";

import { Sidebar, SidebarProvider } from "@cursos/ui/components/sidebar";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ComRoteador } from "@/components/roteador.test-utils";
import { caminhoDaAula, caminhoDoCurso } from "@/lib/rotas";

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

const renderizar = (arvore: ReactNode) => () =>
  renderToStaticMarkup(
    <ComRoteador caminho="/meus-cursos">{arvore}</ComRoteador>
  );

describe("useAlternarNavegacao exige o ProvedorDaCasca na renderização, e não só no clique", () => {
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

const ESTADO = /data-state="(\w+)"/;

function estadoNoServidor(caminho: string, cookieAberta: boolean) {
  const html = renderToStaticMarkup(
    <ComRoteador caminho={caminho}>
      <ProvedorDaCasca aberta={cookieAberta}>
        <Sidebar collapsible="icon">
          <span>menu</span>
        </Sidebar>
      </ProvedorDaCasca>
    </ComRoteador>
  );

  return html.match(ESTADO)?.[1];
}

describe("na carga direta da aula, a sidebar chega recolhida do servidor", () => {
  test("com o cookie dizendo aberta", () => {
    expect(estadoNoServidor(caminhoDaAula("comercial", "a1"), true)).toBe(
      "collapsed"
    );
  });

  test("fora da aula, o cookie manda", () => {
    expect(estadoNoServidor(caminhoDoCurso("comercial"), true)).toBe(
      "expanded"
    );
    expect(estadoNoServidor("/meus-cursos", false)).toBe("collapsed");
  });
});
