import { describe, expect, test } from "bun:test";
import type {
  ListaDePessoas,
  PessoaNaLista,
} from "@cursos/api/dominio/pessoas";
import { renderToStaticMarkup } from "react-dom/server";

import { ListaDePessoasDoAdmin } from "./lista-de-pessoas";

const TAG = /<[^>]+>/g;
const LINHA = /<li[^>]*>.*?<\/li>/g;
const texto = (html: string) =>
  html.replace(TAG, " ").replace(/\s+/g, " ").trim();

const HOJE = "2026-10-20";

const pessoa = (
  nome: string,
  doCadastro: boolean,
  papel: PessoaNaLista["papel"] = "aluno"
): PessoaNaLista => ({
  email: `${nome.toLowerCase()}@example.com`,
  foto: null,
  nome,
  papel,
  perfil: { doCadastro, perfil: "publico" },
  ultimoAcesso: new Date("2026-10-19T15:00:00.000Z"),
  userId: `user_${nome.toLowerCase()}`,
});

const LISTA: ListaDePessoas = {
  contagem: { cliente: 0, funcionario: 0, publico: 1 },
  filtro: null,
  pessoas: [pessoa("Carla", true), pessoa("Ana", false, "admin")],
  total: 2,
};

const linhas = () =>
  (
    renderToStaticMarkup(
      <ListaDePessoasDoAdmin hoje={HOJE} lista={LISTA} termo="" />
    ).match(LINHA) ?? []
  ).map(texto);

describe("a lista de Pessoas", () => {
  test("o título diz a ordem da lista, não que todos estão ativos", () => {
    expect(
      texto(
        renderToStaticMarkup(
          <ListaDePessoasDoAdmin hoje={HOJE} lista={LISTA} termo="" />
        )
      )
    ).toStartWith("Por último acesso");
  });

  test("sem linha de perfil, a frase diz que o perfil é o do cadastro e fica fora dos filtros, sem negar o acesso", () => {
    const [carla, ana] = linhas();
    expect(carla).not.toContain("Ainda não entrou");
    expect(carla).toContain("Perfil do cadastro, fora dos filtros");
    expect(carla).toContain("Ontem");
    expect(ana).not.toContain("Perfil do cadastro");
  });

  test("abaixo de 44rem, o perfil, o papel e o último acesso descem para uma linha sob o e-mail", () => {
    const [carla, ana] = linhas();
    expect(carla).toContain(
      "carla@example.com Perfil do cadastro, fora dos filtros Público aberto Último acesso: ontem"
    );
    expect(ana).toContain(
      "ana@example.com Público aberto Admin Último acesso: ontem"
    );
  });
});
