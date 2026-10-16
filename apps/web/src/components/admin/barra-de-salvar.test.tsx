import { describe, expect, test } from "bun:test";
import type { ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { BarraDeSalvar, SituacaoESalvar } from "./barra-de-salvar";

const TAG = /<[^>]+>/g;
const BOTAO = /<button[^>]*>/;
const SITUACAO = /aria-live="polite"[^>]*>(.*?)<\/div>/;
const DESCRITO_POR = /aria-describedby="([^"]+)"/;
const texto = (html: string) =>
  html.replace(TAG, " ").replace(/\s+/g, " ").trim();

const nada = () => undefined;

const ESTADO = {
  novo: false,
  pendente: false,
  problemas: [],
  recarregar: nada,
  sujo: false,
  versaoMudou: false,
};

const barra = (props: Partial<ComponentProps<typeof BarraDeSalvar>> = {}) =>
  texto(
    renderToStaticMarkup(
      <BarraDeSalvar
        novo={false}
        pendente={false}
        problemas={[]}
        recarregar={nada}
        sujo={false}
        versaoMudou={false}
        {...props}
      />
    )
  );

describe("BarraDeSalvar", () => {
  test("conta os campos marcados e mostra cada frase sem campo", () => {
    const t = barra({
      problemas: [
        { campo: "curso-titulo", mensagem: "Preencha este campo." },
        { campo: "curso-slug", mensagem: "Preencha este campo." },
        {
          campo: null,
          mensagem: "O curso tem um valor que o servidor recusa.",
        },
      ],
    });
    expect(t).toContain("Confira 2 campos marcados.");
    expect(t).toContain("O curso tem um valor que o servidor recusa.");
  });

  test("sem problema, diz em que pé está o rascunho", () => {
    expect(barra({ novo: true })).toContain(
      "Rascunho. Os alunos não veem nada até você salvar."
    );
    expect(barra({ sujo: true })).toContain("Mudanças não salvas.");
    expect(barra()).toContain("Tudo salvo.");
  });

  const salvar = (props: Partial<ComponentProps<typeof BarraDeSalvar>>) => {
    const html = renderToStaticMarkup(
      <BarraDeSalvar
        novo={false}
        pendente={false}
        problemas={[]}
        recarregar={nada}
        sujo={false}
        versaoMudou={false}
        {...props}
      />
    );
    const botao = BOTAO.exec(html)?.[0] ?? "";
    const id = DESCRITO_POR.exec(botao)?.[1];
    const descricao = id
      ? texto(new RegExp(`id="${id}"[^>]*>(.*?)</`).exec(html)?.[1] ?? "")
      : null;
    return { botao, descricao };
  };

  test("sem nada a salvar, o Salvar fica desligado e diz por quê", () => {
    const { botao, descricao } = salvar({});
    expect(botao).toContain("data-disabled");
    expect(descricao).toBe("Tudo salvo.");
  });

  test("documento novo e rascunho sujo deixam o Salvar ativo, no Sol", () => {
    for (const props of [{ novo: true }, { sujo: true }]) {
      const { botao, descricao } = salvar(props);
      expect(botao).toContain('type="submit"');
      expect(botao).toContain("hover:bg-sol-hover");
      expect(botao).not.toContain("data-disabled");
      expect(descricao).toBeNull();
    }
  });

  test("com o envio pendente, o Salvar fica no Sol, ocupado, sem dizer Tudo salvo", () => {
    const { botao, descricao } = salvar({ pendente: true });
    expect(botao).toContain('type="submit"');
    expect(botao).toContain("hover:bg-sol-hover");
    expect(botao).toContain('aria-busy="true"');
    expect(descricao).toBeNull();
  });

  test("com a versão mudada, avisa com o nome do documento e oferece Recarregar", () => {
    const t = barra({ versaoMudou: true });
    expect(t).toContain(
      "Outra pessoa salvou este curso depois que você abriu."
    );
    expect(t).toContain("Recarregar");
    expect(barra()).not.toContain("Outra pessoa salvou");
  });

  test("com o envio pendente, a situação diz Salvando…", () => {
    expect(barra({ pendente: true, sujo: true })).toContain("Salvando…");
  });

  test("a coluna e a barra leem a mesma situação e o mesmo Salvar", () => {
    const estado = { ...ESTADO, sujo: true };
    const coluna = renderToStaticMarkup(
      <SituacaoESalvar coluna estado={estado} />
    );
    const naBarra = renderToStaticMarkup(<BarraDeSalvar {...estado} />);
    const situacao = (html: string) => texto(SITUACAO.exec(html)?.[1] ?? "");
    expect(situacao(coluna)).toBe("Mudanças não salvas.");
    expect(situacao(naBarra)).toBe(situacao(coluna));
    expect(texto(coluna)).toContain("Ctrl S");
    expect(BOTAO.exec(coluna)?.[0]).toContain("hover:bg-sol-hover");
  });
});
