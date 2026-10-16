import { afterAll, describe, expect, mock, test } from "bun:test";
import { Sidebar, SidebarProvider } from "@cursos/ui/components/sidebar";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { caminhoDaAula, caminhoDoCurso } from "@/lib/rotas";

// Fora do App Router o usePathname não tem de onde ler; o teste diz o caminho.
let caminhoAtual = "/meus-cursos";
const navegacao = await import("next/navigation");
mock.module("next/navigation", () => ({
  ...navegacao,
  usePathname: () => caminhoAtual,
}));

// O mock vale para os arquivos que rodam depois, no mesmo processo: eles ficam fora da aula.
afterAll(() => {
  caminhoAtual = "/meus-cursos";
});

const { ProvedorDaCasca, useAlternarNavegacao, useModoDaCasca } = await import(
  "./provedor-da-casca"
);

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

const ESTADO = /data-state="(\w+)"/;

/** O data-state que a sidebar do computador escreve no HTML do servidor. */
function estadoNoServidor(caminho: string, cookieAberta: boolean) {
  caminhoAtual = caminho;
  const html = renderToStaticMarkup(
    <ProvedorDaCasca aberta={cookieAberta}>
      <Sidebar collapsible="icon">
        <span>menu</span>
      </Sidebar>
    </ProvedorDaCasca>
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
