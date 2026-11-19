import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";

import {
  abrirChromium,
  avaliar,
  CHROMIUM,
  type Enviar,
  fecharChromium,
  avaliarComo,
} from "../../chromium.test-utils";
import {
  ehBooleano,
  ehLista,
  ehNumero,
  ehObjeto,
  ehQualquer,
  ehTexto,
  type Predicado,
} from "../../predicados.test-utils";
import {
  AJUDANTES_DO_CONVIDAR,
  empacotarConvidar,
} from "./convidar-no-browser";

let enviar: Enviar;
let pacote: string;

async function abrir() {
  await avaliar(
    enviar,
    `document.open(); document.write('<!doctype html><html><body><div id="raiz"></div></body></html>'); document.close();`
  );
  await avaliar(enviar, pacote);
  await avaliar(enviar, AJUDANTES_DO_CONVIDAR);
  await avaliar(enviar, "window.abrir()");
}

const rodar = (codigo: string) =>
  avaliar(enviar, `(async () => { ${codigo} })()`);

const rodarComo = <T,>(codigo: string, eh: Predicado<T>) =>
  avaliarComo(enviar, `(async () => { ${codigo} })()`, eh);

interface BotaoDeEnviar {
  desligado: boolean;
  texto: string;
}

const ehBotaoDeEnviar: Predicado<BotaoDeEnviar> = ehObjeto({
  desligado: ehBooleano,
  texto: ehTexto,
});

const botaoDeEnviar = () =>
  avaliarComo(enviar, "window.enviar()", ehBotaoDeEnviar);

const fichas = () => avaliarComo(enviar, "window.fichas()", ehLista(ehTexto));

const aberto = () =>
  avaliarComo(enviar, "Boolean(window.dialogo())", ehBooleano);

const focado = () =>
  avaliarComo(
    enviar,
    `document.activeElement.getAttribute("aria-label") ?? document.activeElement.getAttribute("inputmode") ?? document.activeElement.tagName`,
    ehTexto
  );

const TECLAS = {
  Backspace: { codigo: 8, texto: undefined },
  Enter: { codigo: 13, texto: "\r" },
  Escape: { codigo: 27, texto: undefined },
  Tab: { codigo: 9, texto: undefined },
} as const;

async function tecla(nome: keyof typeof TECLAS, shift = false) {
  const { codigo, texto } = TECLAS[nome];

  const base = {
    code: nome,
    key: nome,
    modifiers: shift ? 8 : 0,
    windowsVirtualKeyCode: codigo,
  };

  await enviar("Input.dispatchKeyEvent", {
    ...base,
    text: texto,
    type: texto ? "keyDown" : "rawKeyDown",
  });
  await enviar("Input.dispatchKeyEvent", { ...base, type: "keyUp" });
  await avaliar(enviar, "new Promise((r) => setTimeout(r, 50))");
}

describe.skipIf(!existsSync(CHROMIUM))("convidar por e-mail no browser", () => {
  beforeAll(async () => {
    enviar = await abrirChromium("convidar");
    pacote = await empacotarConvidar();
  }, 20_000);

  afterAll(fecharChromium);

  test("o diálogo abre vazio, com o perfil em Público aberto e o envio desligado", async () => {
    await abrir();
    expect(await botaoDeEnviar()).toEqual({
      desligado: true,
      texto: "Enviar convites",
    });
    expect(
      await rodarComo(
        `return dialogo().querySelector('input[type="radio"]:checked').value;`,
        ehTexto
      )
    ).toBe("publico");
    expect(
      await rodarComo(
        `return dialogo().querySelector('[role="switch"]').getAttribute("aria-checked");`,
        ehTexto
      )
    ).toBe("false");
  });

  test("colar uma lista com vírgula, ponto e vírgula e quebra de linha vira uma ficha por e-mail", async () => {
    await abrir();
    await rodar(`await colar("Ana@x.com, bia@x.com;caio@x.com\\ndani@x.com");`);
    expect(await fichas()).toEqual([
      "ana@x.com",
      "bia@x.com",
      "caio@x.com",
      "dani@x.com",
    ]);
    expect(await botaoDeEnviar()).toEqual({
      desligado: false,
      texto: "Enviar 4 convites",
    });
  });

  test("a ficha que não é e-mail trava o envio até sair do campo", async () => {
    await abrir();
    await rodar(`await escrever("ana@x.com carla@exemplo ");`);
    expect(await fichas()).toEqual(["ana@x.com", "carla@exemplo"]);
    expect((await botaoDeEnviar()).desligado).toBe(true);
    expect(
      await rodarComo(
        `const campo = dialogo().querySelector('input[inputmode="email"]');
         return document.getElementById(campo.getAttribute("aria-describedby")).textContent;`,
        ehTexto
      )
    ).toBe("carla@exemplo não é um e-mail. Corrija ou apague para enviar.");
    await rodar("await clicarEmEnviar();");
    expect(await avaliarComo(enviar, "window.chamadas.length", ehNumero)).toBe(
      0
    );

    await rodar(
      `botaoCom(dialogo(), "Tirar carla@exemplo").click(); await esperar(0);`
    );
    expect(await botaoDeEnviar()).toEqual({
      desligado: false,
      texto: "Enviar 1 convite",
    });
  });

  test("Enter fecha a ficha escrita, e Backspace no campo vazio traz a última de volta", async () => {
    await abrir();
    await rodar(
      `await escrever("ana@x.com"); dialogo().querySelector('input[inputmode="email"]').focus();`
    );
    await tecla("Enter");
    expect(await fichas()).toEqual(["ana@x.com"]);
    expect(await avaliarComo(enviar, "window.chamadas.length", ehNumero)).toBe(
      0
    );
    await tecla("Backspace");
    expect(await fichas()).toEqual([]);
    expect(
      await rodarComo(
        `return dialogo().querySelector('input[inputmode="email"]').value;`,
        ehTexto
      )
    ).toBe("ana@x.com");
  });

  test("o perfil, o papel e os cursos escolhidos vão no pedido, e tudo enviado fecha o diálogo", async () => {
    await abrir();
    await rodar(`
      await escrever("ana@x.com, bia@x.com ");
      [...dialogo().querySelectorAll("label")].find((l) => l.textContent.trim() === "Cliente").click();
      dialogo().querySelector('[role="switch"]').click();
      dialogo().querySelectorAll('[role="checkbox"]')[1].click();
      await esperar(0);
      await clicarEmEnviar();
    `);
    expect(
      await avaliarComo(enviar, "window.chamadas", ehLista(ehQualquer))
    ).toEqual([
      {
        comoAdmin: true,
        cursoIds: ["c2"],
        emails: ["ana@x.com", "bia@x.com"],
        perfil: "cliente",
      },
    ]);
    expect(await aberto()).toBe(false);
    expect(
      await avaliarComo(enviar, "window.toasts", ehLista(ehTexto))
    ).toEqual(["2 convites enviados"]);
  });

  test("o que não saiu fica no diálogo, cada ficha com a frase dela", async () => {
    await abrir();
    await rodar(`
      window.resposta = () => ({ convites: [
        { email: "ana@x.com", tipo: "enviado" },
        { email: "bia@x.com", tipo: "ja_tem_conta", userId: "user_bia" },
        { email: "caio@x.com", tipo: "ja_convidado", enviado: true },
      ] });
      await escrever("ana@x.com bia@x.com caio@x.com ");
      await clicarEmEnviar();
    `);
    expect(await aberto()).toBe(true);
    expect(await fichas()).toEqual(["bia@x.com", "caio@x.com"]);

    const corpo = await rodarComo(
      `return dialogo().textContent.replace(/\\s+/g, " ");`,
      ehTexto
    );

    expect(corpo).toContain("bia@x.com Já tem conta. Mude na ficha dela.");
    expect(corpo).toContain(
      "caio@x.com Já tem convite pendente. Reenvie ou cancele em Convidados."
    );
    expect(
      await rodarComo(
        `return dialogo().querySelector('a[href^="/admin/pessoas/"]').getAttribute("href");`,
        ehTexto
      )
    ).toBe("/admin/pessoas/user_bia");
    expect(
      await avaliarComo(enviar, "window.toasts", ehLista(ehTexto))
    ).toEqual(["1 convite enviado"]);

    await rodar(
      `botaoCom(dialogo(), "Tirar bia@x.com").click(); await esperar(0);`
    );
    expect(
      await rodarComo(
        `return dialogo().textContent.replace(/\\s+/g, " ");`,
        ehTexto
      )
    ).not.toContain("Já tem conta");
  });

  test("a região de status, sempre na tela, diz quantos e-mails há e por que o envio não sai", async () => {
    await abrir();

    const status = () =>
      avaliarComo(
        enviar,
        `({ mesma: window.regiao === dialogo().querySelector('[role="status"]'), texto: window.regiao.textContent })`,
        ehObjeto({ mesma: ehBooleano, texto: ehTexto })
      );

    expect(
      await avaliarComo(
        enviar,
        `(window.regiao = dialogo().querySelector('[role="status"]')) !== null`,
        ehBooleano
      )
    ).toBe(true);
    expect(await status()).toEqual({
      mesma: true,
      texto: "Nenhum e-mail escrito.",
    });
    await rodar(`await escrever("ana@x.com ");`);
    expect(await status()).toEqual({
      mesma: true,
      texto: "1 e-mail escrito.",
    });
    await rodar(
      `await escrever("abc"); dialogo().querySelector('input[inputmode="email"]').focus();`
    );
    await tecla("Enter");
    expect(await fichas()).toEqual(["ana@x.com", "abc"]);
    expect(await status()).toEqual({
      mesma: true,
      texto:
        "2 e-mails escritos. abc não é um e-mail. Corrija ou apague para enviar.",
    });
  });

  test("as sobras do envio entram numa região viva que já estava na tela", async () => {
    await abrir();
    const regiao = `dialogo().querySelector('[aria-live="polite"]')`;
    expect(
      await avaliarComo(
        enviar,
        `(window.viva = ${regiao}) !== null`,
        ehBooleano
      )
    ).toBe(true);
    expect(await avaliarComo(enviar, "window.viva.textContent", ehTexto)).toBe(
      ""
    );
    await rodar(`
      window.resposta = () => ({ convites: [
        { email: "bia@x.com", tipo: "ja_convidado", enviado: false },
      ] });
      await escrever("bia@x.com ");
      await clicarEmEnviar();
    `);
    expect(
      await avaliarComo(enviar, `window.viva === ${regiao}`, ehBooleano)
    ).toBe(true);
    expect(await avaliarComo(enviar, "window.viva.textContent", ehTexto)).toBe(
      "bia@x.com Já tem convite, mas o e-mail não saiu. Envie em Convidados."
    );
  });

  test("tirar uma ficha pelo teclado devolve o foco ao campo de e-mails", async () => {
    await abrir();
    await rodar(
      `await escrever("ana@x.com bia@x.com "); dialogo().querySelector('input[inputmode="email"]').focus();`
    );
    await tecla("Tab", true);
    expect(await focado()).toBe("Tirar bia@x.com");
    await tecla("Enter");
    expect(await fichas()).toEqual(["ana@x.com"]);
    expect(await focado()).toBe("email");
  });

  test("com rascunho, o Escape não fecha o diálogo; sem rascunho, fecha", async () => {
    await abrir();
    await rodar(
      `await escrever("ana@x.com "); dialogo().querySelector('input[inputmode="email"]').focus();`
    );
    await tecla("Escape");
    expect(await aberto()).toBe(true);
    expect(await fichas()).toEqual(["ana@x.com"]);

    await rodar(
      `botaoCom(dialogo(), "Tirar ana@x.com").click(); await esperar(0);`
    );
    await tecla("Escape");
    await rodar("await esperar(100);");
    expect(await aberto()).toBe(false);
  });

  test("Cancelar fecha e esquece o rascunho", async () => {
    await abrir();
    await rodar(`
      await escrever("ana@x.com ");
      botaoCom(dialogo(), "Cancelar").click();
      await esperar(100);
    `);
    expect(await aberto()).toBe(false);
    await avaliar(enviar, "window.abrir()");
    expect(await fichas()).toEqual([]);
  });
});
