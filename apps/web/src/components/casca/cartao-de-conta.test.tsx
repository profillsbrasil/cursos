import { describe, expect, test } from "bun:test";

import { renderToStaticMarkup } from "react-dom/server";

import {
  type ContaNoCartao,
  MenuDaConta,
  type Placar,
} from "./cartao-de-conta";
import { ProvedorDaCasca } from "./provedor-da-casca";

const ANA: ContaNoCartao = {
  fullName: "Ana Souza",
  hasImage: false,
  imageUrl: "",
  primaryEmailAddress: null,
};

const sair = () => Promise.resolve();

const resolvida = <T,>(valor: T) =>
  Object.assign(Promise.resolve(valor), { status: "fulfilled", value: valor });

const gatilho = (placar: Promise<Placar | null> | null) =>
  renderToStaticMarkup(
    <ProvedorDaCasca aberta={true}>
      <MenuDaConta
        carregada
        conta={ANA}
        outraArea={null}
        placar={placar}
        sair={sair}
      />
    </ProvedorDaCasca>
  );

const texto = (h: string) =>
  h
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

describe("o gatilho do cartão de conta", () => {
  test("com sequência zero, mostra o saldo e nada da sequência, nem para o leitor de tela", () => {
    const h = gatilho(resolvida({ saldo: 610, sequenciaDias: 0 }));
    expect(texto(h)).toBe("AS Conta de Ana Souza , saldo de 610 pts");
    expect(h).not.toContain("text-canela");
  });

  test("com sequência, mostra o saldo e a sequência com a chama", () => {
    const h = gatilho(resolvida({ saldo: 610, sequenciaDias: 3 }));
    expect(texto(h)).toBe(
      "AS Conta de Ana Souza , saldo de 610 pts , sequência de 3 dias"
    );
    expect(h).toContain("text-canela");
  });

  test("no admin, sem placar, mostra só o nome, sem saldo nem sequência", () => {
    const h = gatilho(null);
    expect(texto(h)).toBe("AS Conta de Ana Souza");
    expect(h).not.toContain("text-sol");
    expect(h).not.toContain("animate-pulse");
  });
});
