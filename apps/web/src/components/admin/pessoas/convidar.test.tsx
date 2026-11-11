import { describe, expect, mock, test } from "bun:test";
import type {
  ConvidadoNaTela,
  Email,
  PainelDeConvites,
} from "@cursos/api/dominio/convite";
import type { ConviteId, CursoId, DiaISO } from "@cursos/api/dominio/tipos";
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

const { Convidar } = await import("./convidar");
const { ListaDeConvidados } = await import("./lista-de-convidados");

const TAG = /<[^>]+>/g;
const texto = (html: string) =>
  html.replace(TAG, " ").replace(/\s+/g, " ").trim();
const BOTAO = /<button[^>]*>.*?<\/button>/g;
const NOME = /aria-label="([^"]+)"/;

const HOJE = "2026-11-11" as DiaISO;

const convidado = (
  email: string,
  mudar: Partial<ConvidadoNaTela> = {}
): ConvidadoNaTela => ({
  comoAdmin: false,
  convidadoEm: "2026-11-04" as DiaISO,
  cursos: [],
  email: email as Email,
  estado: {
    enviadoEm: HOJE,
    expiraEm: "2026-12-11" as DiaISO,
    tipo: "pendente",
  },
  id: `id-${email}` as ConviteId,
  perfil: "cliente",
  ...mudar,
});

const painel = (convidados: ConvidadoNaTela[], total = convidados.length) =>
  ({
    contagem: { cliente: 2, funcionario: 3, publico: 9 },
    convidados,
    cursos: [],
    hoje: HOJE,
    total,
  }) satisfies PainelDeConvites;

describe("o botão Convidar", () => {
  test("fechado, a página só tem o botão: o diálogo não está na tela", () => {
    const tela = renderToStaticMarkup(<Convidar cursos={[]} />);
    expect(texto(tela)).toBe("Convidar");
    expect(tela).not.toContain('role="dialog"');
  });
});

describe("a opção Convidados", () => {
  const tela = renderToStaticMarkup(
    <ListaDeConvidados
      convites={painel([
        convidado("ana@x.com", {
          comoAdmin: true,
          cursos: [
            { id: "c1" as CursoId, titulo: "Envase" },
            { id: "c2" as CursoId, titulo: "Rotulagem" },
          ],
          perfil: "funcionario",
        }),
        convidado("bia@x.com", { estado: { tipo: "nao_enviado" } }),
        convidado("caio@x.com", {
          estado: { em: "2026-11-10" as DiaISO, tipo: "expirado" },
        }),
      ])}
      termo=""
    />
  );

  test("cada linha diz o e-mail, o envio, o perfil, o papel, os cursos e o estado", () => {
    expect(texto(tela)).toContain(
      "ana@x.com Enviado hoje Funcionário Admin 2 cursos Pendente"
    );
    expect(texto(tela)).toContain(
      "bia@x.com Convidado em 4 de nov., sem e-mail enviado Cliente Aluno Nenhum curso Não enviado"
    );
    expect(texto(tela)).toContain(
      "caio@x.com Expirou ontem Cliente Aluno Nenhum curso Expirado"
    );
  });

  test("a linha tem Reenviar e Cancelar, e a que nunca saiu tem Enviar", () => {
    const nomes = (tela.match(BOTAO) ?? []).map(
      (b) => NOME.exec(b)?.[1] ?? texto(b)
    );
    expect(nomes).toEqual([
      "Reenviar o convite de ana@x.com",
      "Cancelar o convite de ana@x.com",
      "Enviar o convite de bia@x.com",
      "Cancelar o convite de bia@x.com",
      "Reenviar o convite de caio@x.com",
      "Cancelar o convite de caio@x.com",
    ]);
  });

  test("sem convite pendente, diz o que fazer; com busca, diz o que não achou", () => {
    expect(
      texto(
        renderToStaticMarkup(
          <ListaDeConvidados convites={painel([])} termo="" />
        )
      )
    ).toContain(
      "Nenhum convite pendente. Use o botão Convidar para chamar alguém."
    );
    expect(
      texto(
        renderToStaticMarkup(
          <ListaDeConvidados convites={painel([], 4)} termo="zeca" />
        )
      )
    ).toContain("Nenhum convite pendente com &quot;zeca&quot; no e-mail.");
  });

  test("a lista cortada em 100 manda buscar pelo e-mail", () => {
    const cortada = renderToStaticMarkup(
      <ListaDeConvidados
        convites={painel([convidado("ana@x.com")], 250)}
        termo=""
      />
    );
    expect(texto(cortada)).toContain(
      "Mostrando os 1 mais recentes. Busque pelo e-mail para achar quem falta."
    );
  });
});
