import { describe, expect, test } from "bun:test";
import type { ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { BarraDeSalvar } from "./barra-de-salvar";

const TAG = /<[^>]+>/g;
const texto = (html: string) =>
  html.replace(TAG, " ").replace(/\s+/g, " ").trim();

const nada = () => undefined;

const barra = (props: Partial<ComponentProps<typeof BarraDeSalvar>> = {}) =>
  texto(
    renderToStaticMarkup(
      <BarraDeSalvar
        novo={false}
        oQue="esta trilha"
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
        { campo: "trilha-titulo", mensagem: "Preencha este campo." },
        { campo: "trilha-slug", mensagem: "Preencha este campo." },
        {
          campo: null,
          mensagem: "A trilha tem um valor que o servidor recusa.",
        },
      ],
    });
    expect(t).toContain("Confira 2 campos marcados.");
    expect(t).toContain("A trilha tem um valor que o servidor recusa.");
  });

  test("sem problema, diz em que pé está o rascunho", () => {
    expect(barra({ novo: true })).toContain(
      "Rascunho. Os alunos não veem nada até você salvar."
    );
    expect(barra({ sujo: true })).toContain("Alterações não salvas.");
    expect(barra()).toContain("Tudo salvo.");
  });

  test("com a versão mudada, avisa com o nome do documento e oferece Recarregar", () => {
    const t = barra({ versaoMudou: true });
    expect(t).toContain(
      "Outra pessoa salvou esta trilha depois que você abriu."
    );
    expect(t).toContain("Recarregar");
    expect(barra()).not.toContain("Outra pessoa salvou");
  });

  test("os avisos de quem chama entram acima da situação", () => {
    const t = barra({ children: <p>Aviso de quem chama</p>, sujo: true });
    expect(t.indexOf("Aviso de quem chama")).toBeLessThan(
      t.indexOf("Alterações não salvas.")
    );
  });
});
