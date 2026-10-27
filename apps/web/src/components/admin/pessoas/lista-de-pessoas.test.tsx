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
  papel: PessoaNaLista["papel"] = "aluno",
  saldo = 0
): PessoaNaLista => ({
  email: `${nome.toLowerCase()}@example.com`,
  foto: null,
  nome,
  papel,
  perfil: { doCadastro, perfil: "publico" },
  saldo,
  ultimoAcesso: new Date("2026-10-19T15:00:00.000Z"),
  userId: `user_${nome.toLowerCase()}`,
});

const LISTA: ListaDePessoas = {
  contagem: { cliente: 0, funcionario: 0, publico: 1 },
  filtro: null,
  pessoas: [
    pessoa("Carla", true, "aluno", 5000),
    pessoa("Ana", false, "admin"),
  ],
  total: 2,
};

const linhasEmHtml = () =>
  renderToStaticMarkup(
    <ListaDePessoasDoAdmin hoje={HOJE} lista={LISTA} termo="" />
  ).match(LINHA) ?? [];
const linhas = () => linhasEmHtml().map(texto);

/** As classes do elemento que tem só o texto dado. */
const classesDe = (linha: string, conteudo: string) =>
  linha.match(new RegExp(`class="([^"]*)"[^>]*>${conteudo}<`))?.[1] ?? "";

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

  test("abaixo de 52rem, o perfil, o papel e o último acesso descem para uma linha sob o e-mail", () => {
    const [carla, ana] = linhas();
    expect(carla).toContain(
      "carla@example.com Perfil do cadastro, fora dos filtros Público aberto Último acesso: ontem"
    );
    expect(ana).toContain(
      "ana@example.com Público aberto Admin Último acesso: ontem"
    );
  });

  test("a coluna Saldo fica entre o papel e o último acesso, em Sol, à direita e no formato do app", () => {
    const [carla, ana] = linhas();
    expect(carla).toContain("Aluno 5.000 pts Ontem");
    expect(ana).toContain("Admin 0 pts Ontem");
    const classes = classesDe(linhasEmHtml()[0] ?? "", "5.000 pts").split(" ");
    expect(classes).toContain("text-sol");
    expect(classes).toContain("text-right");
  });

  test("saldo zero sai em texto-apagado, sem o Sol", () => {
    const classes = classesDe(linhasEmHtml()[1] ?? "", "0 pts").split(" ");
    expect(classes).toContain("text-muted-foreground");
    expect(classes).not.toContain("text-sol");
  });

  test("abaixo do ponto das colunas, o saldo continua visível na coluna dele", () => {
    const classes = classesDe(linhasEmHtml()[0] ?? "", "5.000 pts").split(" ");
    expect(classes).toContain("text-sol");
    expect(classes.some((c) => c.endsWith("hidden"))).toBe(false);
  });
});
