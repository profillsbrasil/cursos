import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";

import {
  abrirChromium,
  avaliar,
  CHROMIUM,
  type Enviar,
  fecharChromium,
} from "../../chromium-de-teste";
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

const rodar = <T,>(codigo: string) =>
  avaliar<T>(enviar, `(async () => { ${codigo} })()`);

interface BotaoDeEnviar {
  desligado: boolean;
  texto: string;
}

const botaoDeEnviar = () => avaliar<BotaoDeEnviar>(enviar, "window.enviar()");
const fichas = () => avaliar<string[]>(enviar, "window.fichas()");
const aberto = () => avaliar<boolean>(enviar, "Boolean(window.dialogo())");

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
      await rodar<string>(
        `return dialogo().querySelector('input[type="radio"]:checked').value;`
      )
    ).toBe("publico");
    expect(
      await rodar<string>(
        `return dialogo().querySelector('[role="switch"]').getAttribute("aria-checked");`
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
      await rodar<string>(
        `const campo = dialogo().querySelector('input[inputmode="email"]');
         return document.getElementById(campo.getAttribute("aria-describedby")).textContent;`
      )
    ).toBe("carla@exemplo não é um e-mail. Corrija ou apague para enviar.");
    await rodar("await clicarEmEnviar();");
    expect(await avaliar<number>(enviar, "window.chamadas.length")).toBe(0);

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
    const tecla = async (key: string, codigo: number) => {
      await enviar("Input.dispatchKeyEvent", {
        code: key,
        key,
        type: "rawKeyDown",
        windowsVirtualKeyCode: codigo,
      });
      await enviar("Input.dispatchKeyEvent", {
        code: key,
        key,
        type: "keyUp",
        windowsVirtualKeyCode: codigo,
      });
      await rodar("await esperar(0);");
    };
    await tecla("Enter", 13);
    expect(await fichas()).toEqual(["ana@x.com"]);
    expect(await avaliar<number>(enviar, "window.chamadas.length")).toBe(0);
    await tecla("Backspace", 8);
    expect(await fichas()).toEqual([]);
    expect(
      await rodar<string>(
        `return dialogo().querySelector('input[inputmode="email"]').value;`
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
    expect(await avaliar<unknown[]>(enviar, "window.chamadas")).toEqual([
      {
        comoAdmin: true,
        cursoIds: ["c2"],
        emails: ["ana@x.com", "bia@x.com"],
        perfil: "cliente",
      },
    ]);
    expect(await aberto()).toBe(false);
    expect(await avaliar<string[]>(enviar, "window.toasts")).toEqual([
      "2 convites enviados",
    ]);
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
    const corpo = await rodar<string>(
      `return dialogo().textContent.replace(/\\s+/g, " ");`
    );
    expect(corpo).toContain("bia@x.com Já tem conta. Mude na ficha dela.");
    expect(corpo).toContain(
      "caio@x.com Já tem convite pendente. Reenvie ou cancele em Convidados."
    );
    expect(
      await rodar<string>(
        `return dialogo().querySelector('a[href^="/admin/pessoas/"]').getAttribute("href");`
      )
    ).toBe("/admin/pessoas/user_bia");
    expect(await avaliar<string[]>(enviar, "window.toasts")).toEqual([
      "1 convite enviado",
    ]);

    await rodar(
      `botaoCom(dialogo(), "Tirar bia@x.com").click(); await esperar(0);`
    );
    expect(
      await rodar<string>(`return dialogo().textContent.replace(/\\s+/g, " ");`)
    ).not.toContain("Já tem conta");
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
