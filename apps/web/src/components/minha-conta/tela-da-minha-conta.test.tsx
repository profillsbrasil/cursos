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
const { folhaDeExemplo, folhaDo, enderecoDaConferencia } = await import(
  "@/components/certificado/folha"
);

/** A barra colorida da prévia antiga: um traço absoluto na esquerda ou uma borda esquerda grossa ou colorida. */
const BARRA_LATERAL =
  /inset-y-0 left-0|w-\[5px\]|border-l-\[?\d|border-l-(sol|ceu|canela)/;

const ORIGEM = "https://cursos.profills.com.br";
const GANHA = {
  exemplo: false,
  folha: folhaDo(
    {
      codigo: "PF7K-2Q9M",
      emitidoEm: "2026-10-14T15:00:00.000Z",
      horas: 3,
      nome: "Nome Antigo Do Certificado",
      tituloDoCurso: "Filmagem da instalação",
    },
    enderecoDaConferencia(ORIGEM, "PF7K-2Q9M")
  ),
};
const EXEMPLO = { exemplo: true, folha: folhaDeExemplo(ORIGEM) };

const texto = (h: string) =>
  h
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function tela(certificados: number, c: Record<string, unknown> = {}) {
  conta = usuario(c);
  return renderToStaticMarkup(
    <TelaDaMinhaConta
      certificados={certificados}
      folha={certificados > 0 ? GANHA : EXEMPLO}
    />
  );
}

describe("a página Minha conta", () => {
  test("as seções seguem a ordem do protótipo B, com Excluir conta no fim", () => {
    const h = tela(0);
    const titulos = [...h.matchAll(/<h[12][^>]*>(.*?)<\/h[12]>/g)].map(
      (m) => m[1]
    );
    expect(titulos).toEqual([
      "Minha conta",
      "Ana Souza",
      "Como você entra",
      "Senha",
      "Aparelhos",
    ]);
    expect(texto(h)).toContain("Sair da conta Excluir conta");
  });

  test("a folha mostra o nome dos campos, não o que veio do servidor", () => {
    const h = tela(1, { firstName: "Bia", lastName: "Lima" });
    expect(h).toContain('value="Bia"');
    expect(h).toContain('value="Lima"');
    expect(texto(h)).toContain("Certificamos que Bia Lima");
    expect(h).not.toContain("Nome Antigo Do Certificado");
    expect(texto(h)).toContain("Filmagem da instalação");
    expect(texto(h)).toContain("Assim o nome sai no certificado");
  });

  test("sem certificado, a folha é o exemplo, sem curso nem código inventados", () => {
    const t = texto(tela(0));
    expect(t).toContain("Exemplo: o seu primeiro certificado sai assim");
    expect(t).toContain("O curso que você concluir");
    expect(t).toContain("XXXX-XXXX");
    expect(t).toContain("Confira em cursos.profills.com.br/certificado ");
    expect(t).toContain("Certificamos que Ana Souza");
  });

  test("a prévia antiga, com a barra Sol na lateral, não volta", () => {
    for (const h of [tela(0), tela(2)]) {
      expect(h).not.toContain("Prévia do nome no certificado");
      expect(h).not.toMatch(BARRA_LATERAL);
      expect(h).toContain("Prévia da folha do certificado de Ana Souza");
    }
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
