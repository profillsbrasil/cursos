import { describe, expect, mock, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

const GOOGLE = {
  emailAddress: "ana@gmail.com",
  id: "eac_1",
  identificationId: "idn_g",
  provider: "google",
};

let conta = {};
const usuario = (c: Record<string, unknown> = {}) => ({
  emailAddresses: [
    {
      emailAddress: "ana@gmail.com",
      id: "idn_1",
      linkedTo: [{ id: GOOGLE.identificationId }],
      verification: { status: "verified" },
    },
  ],
  externalAccounts: [GOOGLE],
  firstName: "Ana",
  hasImage: false,
  id: "user_1",
  imageUrl: "",
  lastName: "Souza",
  passwordEnabled: false,
  primaryEmailAddressId: "idn_1",
  ...c,
});

// Sem o ClerkProvider, os hooks do Clerk lançam; o resto do módulo fica o de verdade.
const clerk = await import("@clerk/nextjs");
mock.module("@clerk/nextjs", () => ({
  ...clerk,
  useClerk: () => ({ signOut: () => undefined }),
  useReverification: (f: unknown) => f,
  useSession: () => ({ session: { id: "sess_1" } }),
  useUser: () => ({ isLoaded: true, user: conta }),
}));

const { TelaDaMinhaConta } = await import("./tela-da-minha-conta");

const texto = (h: string) =>
  h
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function tela(certificados: number, c: Record<string, unknown> = {}) {
  conta = usuario(c);
  return renderToStaticMarkup(<TelaDaMinhaConta certificados={certificados} />);
}

describe("a página Minha conta", () => {
  test("as seções seguem a ordem do protótipo B, com Excluir conta no fim", () => {
    const h = tela(0);
    const titulos = [...h.matchAll(/<h[12][^>]*>(.*?)<\/h[12]>/g)].map(
      (m) => m[1]
    );
    expect(titulos).toEqual([
      "Minha conta",
      "Seu nome",
      "Como você entra",
      "Senha",
      "Aparelhos",
    ]);
    expect(texto(h)).toContain("Sair da conta Excluir conta");
  });

  test("a prévia da folha mostra o nome da conta", () => {
    expect(texto(tela(0))).toContain("Certificado de conclusão Ana Souza");
  });

  test("o aviso dos certificados só aparece com certificado emitido", () => {
    expect(texto(tela(0))).not.toContain("que você já tem");
    expect(texto(tela(1))).toContain(
      "O 1 certificado que você já tem passa a sair com o nome novo, no PDF e na conferência pública."
    );
    expect(texto(tela(2))).toContain(
      "Os 2 certificados que você já tem passam a sair com o nome novo"
    );
  });

  test("sem senha, oferece criar; com senha, trocar", () => {
    expect(texto(tela(0))).toContain("Sem senha");
    expect(texto(tela(0))).toContain("Criar senha");
    expect(texto(tela(0, { passwordEnabled: true }))).toContain("Trocar senha");
  });

  test("o Google não se desconecta quando é o único jeito de entrar", () => {
    const so = texto(tela(0));
    expect(so).toContain("Conectado com ana@gmail.com");
    expect(so).toContain("Crie uma senha antes de desconectar");
    expect(so).not.toContain("Desconectar");
    expect(texto(tela(0, { passwordEnabled: true }))).toContain("Desconectar");
  });

  test("o e-mail principal leva o selo e não se remove", () => {
    const h = texto(tela(0));
    expect(h).toContain(
      "ana@gmail.com E-mail principal. Os códigos e avisos chegam aqui. Principal"
    );
    expect(h).not.toContain("Remover");
  });
});
