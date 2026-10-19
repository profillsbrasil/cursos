import { describe, expect, mock, test } from "bun:test";
import { cloneElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Sem o ClerkProvider, useUser e useClerk lançam; o resto do módulo fica o de verdade.
const clerk = await import("@clerk/nextjs");
mock.module("@clerk/nextjs", () => ({
  ...clerk,
  useClerk: () => ({ signOut: () => undefined }),
  useUser: () => ({
    isLoaded: true,
    user: { fullName: "Ana Souza", hasImage: false },
  }),
}));

// O menu do Base UI só monta no navegador, em portal. Aqui ele vira HTML em linha,
// para o teste ler as placas do menu aberto.
const menu = await import("@cursos/ui/components/dropdown-menu");
const EmLinha = ({ children }: { children?: ReactNode }) => (
  <div data-teste="menu">{children}</div>
);
mock.module("@cursos/ui/components/dropdown-menu", () => ({
  ...menu,
  DropdownMenuContent: EmLinha,
  DropdownMenuItem: ({
    children,
    render,
  }: {
    children?: ReactNode;
    render?: ReactElement;
  }) => (render ? cloneElement(render, {}, children) : <div>{children}</div>),
  DropdownMenuSeparator: () => <hr />,
}));

const { CartaoDeConta } = await import("./cartao-de-conta");
const { ProvedorDaCasca } = await import("./provedor-da-casca");

/** A Promise já resolvida, que o `use` do React lê sem suspender. */
const resolvida = <T,>(valor: T) =>
  Object.assign(Promise.resolve(valor), { status: "fulfilled", value: valor });

const html = (sequenciaDias: number) =>
  renderToStaticMarkup(
    <ProvedorDaCasca aberta={true}>
      <CartaoDeConta
        outraArea={null}
        placar={resolvida({ saldo: 610, sequenciaDias })}
      />
    </ProvedorDaCasca>
  );

const texto = (h: string) =>
  h
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const MENU = '<div data-teste="menu">';
const gatilho = (h: string) => texto(h.split(MENU)[0] ?? "");
const menuAberto = (h: string) => texto(h.split(MENU)[1] ?? "");

describe("o cartão de conta com sequência zero", () => {
  const h = html(0);

  test("o gatilho mostra o saldo e nada da sequência, nem para o leitor de tela", () => {
    expect(gatilho(h)).toBe("AS Conta de Ana Souza , saldo de 610 pts");
    expect(h).not.toContain("text-canela");
  });

  test("o menu mostra só a placa do saldo", () => {
    expect(menuAberto(h)).toBe("Saldo 610 pts Minha conta Sair");
  });
});

describe("o cartão de conta com sequência", () => {
  const h = html(3);

  test("o gatilho mostra o saldo e a sequência com a chama", () => {
    expect(gatilho(h)).toBe(
      "AS Conta de Ana Souza , saldo de 610 pts , sequência de 3 dias"
    );
    expect(h).toContain("text-canela");
  });

  test("o menu mostra as duas placas", () => {
    expect(menuAberto(h)).toBe(
      "Saldo 610 pts Sequência 3 dias Minha conta Sair"
    );
  });
});

describe("o cartão de conta do admin, sem placar", () => {
  const h = renderToStaticMarkup(
    <ProvedorDaCasca aberta={true}>
      <CartaoDeConta outraArea={null} placar={null} />
    </ProvedorDaCasca>
  );

  test("o gatilho mostra só o nome, sem saldo nem sequência", () => {
    expect(gatilho(h)).toBe("AS Conta de Ana Souza");
    expect(h).not.toContain("text-sol");
    expect(h).not.toContain("animate-pulse");
  });

  test("o menu não tem as placas de Saldo e Sequência", () => {
    expect(menuAberto(h)).toBe("Minha conta Sair");
  });
});

const LINK_DA_CONTA = /<a [^>]*href="\/minha-conta"[^>]*>.*?Minha conta<\/a>/;

describe("Minha conta no menu", () => {
  test("é um link para a página da conta, não o modal do Clerk", () => {
    const h = html(0);
    expect(h).toMatch(LINK_DA_CONTA);
  });
});
