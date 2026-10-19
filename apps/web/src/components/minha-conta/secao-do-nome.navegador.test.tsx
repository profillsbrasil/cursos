// O cartão do nome de Minha conta, montado de verdade no Chromium headless, com o
// usuário do Clerk falso: o teste digita, salva, faz o Clerk recusar e mede. Sem
// Chromium na máquina, a suíte pula.

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { build } from "bun";

import { folhaDeExemplo } from "@/components/certificado/folha";

import {
  abrirChromium,
  avaliar,
  CHROMIUM,
  cssDoApp,
  type Enviar,
  fecharChromium,
} from "../chromium-de-teste";

const ENTRADA = join(import.meta.dir, "secao-do-nome.entrada.tsx");
const CLERK = join(import.meta.dir, "clerk-falso.js");
const SONNER = join(import.meta.dir, "sonner-falso.js");
const IMAGEM = join(import.meta.dir, "imagem-falsa.js");
const CLERK_NEXTJS = /^@clerk\/nextjs$/;
const SONNER_PACOTE = /^sonner$/;
const NEXT_IMAGE = /^next\/image$/;

const FOLHA = {
  exemplo: true,
  folha: folhaDeExemplo("https://cursos.profills.com.br"),
};

async function empacotar() {
  const pacote = await build({
    define: { "process.env.NODE_ENV": '"development"' },
    entrypoints: [ENTRADA],
    files: {
      [ENTRADA]: `
        import { ClerkAPIResponseError } from "@clerk/nextjs/errors";
        import { flushSync } from "react-dom";
        import { createRoot } from "react-dom/client";
        import { SecaoDoNome } from "./secao-do-nome";

        // O Clerk falso: grava o pedido e, com window.recusa, recusa como o Clerk recusa.
        window.pedidos = [];
        window.toasts = [];
        const raiz = createRoot(document.getElementById("raiz"));
        const desenhar = (user) =>
          flushSync(() =>
            raiz.render(
              <div className="@container">
                <SecaoDoNome certificados={0} folha={${JSON.stringify(FOLHA)}} key={user.id} user={user} />
              </div>
            )
          );
        const usuario = (dados) => ({
          hasImage: false,
          id: "user_1",
          imageUrl: "",
          primaryEmailAddress: { emailAddress: "ana@exemplo.com" },
          setProfileImage: async () => undefined,
          ...dados,
          update: async (pedido) => {
            window.pedidos.push(pedido);
            if (window.recusa) {
              throw new ClerkAPIResponseError("recusado", { data: [window.recusa], status: 422 });
            }
            // Como o useUser: o usuário salvo volta como um objeto novo.
            setTimeout(() => desenhar(usuario({ ...dados, ...pedido })));
          },
        });
        desenhar(usuario(window.INICIAL));
      `,
      [CLERK]: "export const useReverification = (fazer) => fazer;",
      [SONNER]: `export const toast = {
        error: (m) => window.toasts.push(["erro", m]),
        success: (m) => window.toasts.push(["ok", m]),
      };`,
      [IMAGEM]: `import { createElement } from "react";
        export default function Image({ alt, height, src, style, width }) {
          return createElement("img", { alt, height, src, style, width });
        }`,
    },
    format: "iife",
    plugins: [
      {
        name: "clerk-falso",
        setup(construtor) {
          construtor.onResolve({ filter: CLERK_NEXTJS }, () => ({
            path: CLERK,
          }));
          construtor.onResolve({ filter: SONNER_PACOTE }, () => ({
            path: SONNER,
          }));
          construtor.onResolve({ filter: NEXT_IMAGE }, () => ({
            path: IMAGEM,
          }));
        },
      },
    ],
    target: "browser",
  });
  const [saida] = pacote.outputs;
  if (!(pacote.success && saida)) {
    throw new Error(`o pacote do cartão não saiu: ${pacote.logs.join("\n")}`);
  }
  return saida.text();
}

let enviar: Enviar;
let pacote: string;

/** A página de 1280 px com a casca aberta: o cartão fica com 936 px, como no print. */
async function abrir(inicial: { firstName: string; lastName: string }) {
  await enviar("Emulation.setDeviceMetricsOverride", {
    deviceScaleFactor: 1,
    height: 900,
    mobile: false,
    width: 1280,
  });
  await avaliar(
    enviar,
    `document.open(); document.write(${JSON.stringify(
      '<!doctype html><html class="dark" lang="pt-BR"><head><style id="css"></style></head><body style="margin:0"><main style="margin-left:248px;padding:32px 48px"><div id="raiz"></div></main></body></html>'
    )}); document.close(); window.INICIAL = ${JSON.stringify(inicial)}; window.recusa = null;`
  );
  await avaliar(enviar, pacote);
  await estilizar();
}

/** Compila o CSS do app para as classes que estão na página agora. */
async function estilizar() {
  const classes = await avaliar<string[]>(
    enviar,
    `[...document.querySelectorAll("[class]")].flatMap((e) => [...e.classList])`
  );
  const css = await cssDoApp(classes);
  await avaliar(
    enviar,
    `document.getElementById("css").textContent = ${JSON.stringify(css)}`
  );
}

const digitar = (campo: "nome" | "sobrenome", valor: string) =>
  avaliar(
    enviar,
    `(() => {
      const campo = document.querySelector('input[name="${campo}"]');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(campo, ${JSON.stringify(valor)});
      campo.dispatchEvent(new Event("input", { bubbles: true }));
    })()`
  );

const salvar = () =>
  avaliar(
    enviar,
    `[...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Salvar nome").click()`
  );

const textoDe = (seletor: string) =>
  avaliar<string | null>(
    enviar,
    `document.querySelector(${JSON.stringify(seletor)})?.textContent.replace(/\\s+/g, " ").trim() ?? null`
  );

function esperar(condicao: string) {
  return avaliar(
    enviar,
    `new Promise((pronto, falhou) => {
      const inicio = performance.now();
      const olhar = () => {
        if (${condicao}) return pronto(true);
        if (performance.now() - inicio > 2000) return falhou(new Error("não aconteceu: " + ${JSON.stringify(condicao)}));
        setTimeout(olhar, 20);
      };
      olhar();
    })`
  );
}

const RECUSA_DE_HTML = {
  code: "form_param_value_invalid",
  long_message: 'The first name "<b>" is invalid: contains HTML tags',
  message: "is invalid",
  meta: { param_name: "first_name" },
};

const FOTO_OU_ARQUIVO = /foto|file|arquivo/i;
// O texto dentro de um controle repete o nome dele na árvore.
const TEXTO_SOLTO = new Set(["InlineTextBox", "StaticText"]);

describe.skipIf(!existsSync(CHROMIUM))("o cartão do nome", () => {
  beforeAll(async () => {
    pacote = await empacotar();
    enviar = await abrirChromium("minha-conta");
  }, 30_000);

  afterAll(fecharChromium);

  test("o Clerk recusa: o nome, o avatar e a legenda continuam no nome salvo", async () => {
    await abrir({ firstName: "Ana", lastName: "Souza" });
    await digitar("nome", "Bia");
    await avaliar(enviar, `window.recusa = ${JSON.stringify(RECUSA_DE_HTML)}`);
    await salvar();
    await esperar("window.toasts.length > 0");
    expect(await textoDe("h2")).toBe("Ana Souza");
    expect(await textoDe('[data-slot="avatar-fallback"]')).toBe("AS");
    // A folha é a prévia do que a pessoa digitou, e a legenda diz que não salvou.
    expect(await textoDe("figure p:nth-of-type(2)")).toBe("Bia Souza");
    expect(await textoDe("figure + p")).toBe(
      "Prévia: este nome ainda não foi salvo"
    );
  });

  test("o nome com HTML do teste de usabilidade: o campo avisa a regra antes de enviar", async () => {
    await abrir({ firstName: "Ana", lastName: "Souza" });
    await digitar("nome", "<b>html</b> 😀 -5");
    expect(await textoDe('[data-slot="field-error"]')).toBe(
      "O nome não pode ter os sinais <, > e &."
    );
    expect(
      await avaliar<Record<string, boolean>>(
        enviar,
        `(() => {
        const campo = document.querySelector('input[name="nome"]');
        const botao = [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Salvar nome");
        const erro = document.querySelector('[data-slot="field-error"]').id;
        return {
          botao: botao.disabled && botao.getAttribute("aria-describedby") === erro,
          campo: campo.getAttribute("aria-invalid") === "true" && campo.getAttribute("aria-describedby") === erro,
          sobrenome: document.querySelector('input[name="sobrenome"]').hasAttribute("aria-invalid"),
        };
      })()`
      )
    ).toEqual({ botao: true, campo: true, sobrenome: false });
    await salvar();
    expect(await avaliar<number>(enviar, "window.pedidos.length")).toBe(0);
  });

  test("o nome salvo de 256 letras sem espaço quebra dentro do cartão e da folha", async () => {
    await abrir({ firstName: "A".repeat(256), lastName: "Quebra" });
    const m = await avaliar<Record<string, number>>(
      enviar,
      `(() => {
        const direita = (el) => Math.round(el.getBoundingClientRect().right);
        const folha = document.querySelector("figure");
        const nomeDaFolha = folha.querySelector("p:nth-of-type(2)");
        return {
          coluna: direita(document.querySelector("form")),
          folha: direita(nomeDaFolha.parentElement),
          nomeDaFolha: direita(nomeDaFolha),
          rolagem: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          titulo: direita(document.querySelector("h2")),
          tituloRolagem: document.querySelector("h2").scrollWidth - document.querySelector("h2").clientWidth,
        };
      })()`
    );
    expect(m.titulo).toBeLessThanOrEqual(m.coluna);
    expect(m.tituloRolagem).toBe(0);
    expect(m.nomeDaFolha).toBeLessThanOrEqual(m.folha);
    expect(m.rolagem).toBe(0);
  });

  test("o nome que passa do que a folha comporta: o campo avisa e não envia", async () => {
    await abrir({ firstName: "Ana", lastName: "Souza" });
    await digitar("nome", "A".repeat(30));
    expect(await textoDe('[data-slot="field-error"]')).toBe(
      "Cada palavra do nome vai até 20 letras, para caber na linha do certificado."
    );
    await salvar();
    expect(await avaliar<number>(enviar, "window.pedidos.length")).toBe(0);
  });

  test("o nome apagado: o Salvar fica apagado e diz por quê", async () => {
    await abrir({ firstName: "Ana", lastName: "Souza" });
    expect(await textoDe('[data-slot="field-error"]')).toBeNull();
    await digitar("nome", "   ");
    expect(await textoDe('[data-slot="field-error"]')).toBe(
      "Escreva o seu nome para salvar."
    );
    expect(
      await avaliar<boolean>(
        enviar,
        `(() => {
          const botao = [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Salvar nome");
          const erro = document.querySelector('[data-slot="field-error"]').id;
          return botao.disabled && botao.getAttribute("aria-describedby") === erro &&
            document.querySelector('input[name="nome"]').getAttribute("aria-invalid") === "true";
        })()`
      )
    ).toBe(true);
  });

  test("sem nome salvo e sem mudança, nada acusa erro", async () => {
    await abrir({ firstName: "", lastName: "" });
    expect(await textoDe('[data-slot="field-error"]')).toBeNull();
  });

  test('o campo de arquivo da foto não aparece nem é anunciado ("No file chosen")', async () => {
    await abrir({ firstName: "Ana", lastName: "Souza" });
    const { nodes } = (await enviar("Accessibility.getFullAXTree")) as {
      nodes: {
        ignored: boolean;
        name?: { value: string };
        role?: { value: string };
        value?: { value: string };
      }[];
    };
    const anunciados = nodes
      .filter((n) => !(n.ignored || TEXTO_SOLTO.has(n.role?.value ?? "")))
      .map((n) =>
        [n.role?.value, n.name?.value, n.value?.value].filter(Boolean).join(" ")
      );
    expect(anunciados.filter((t) => FOTO_OU_ARQUIVO.test(t))).toEqual([
      "button Trocar foto",
    ]);
    const visivel = await avaliar<boolean>(
      enviar,
      `(() => { const r = document.querySelector('input[type="file"]').getBoundingClientRect(); return r.width > 1 && r.height > 1; })()`
    );
    expect(visivel).toBe(false);
  });

  test("o Clerk salva: o nome, o avatar e a legenda passam ao nome novo", async () => {
    await abrir({ firstName: "Ana", lastName: "Souza" });
    await digitar("nome", "Bia");
    await salvar();
    await esperar('document.querySelector("h2").textContent === "Bia Souza"');
    expect(await avaliar<unknown>(enviar, "window.pedidos")).toEqual([
      { firstName: "Bia", lastName: "Souza" },
    ]);
    expect(await textoDe('[data-slot="avatar-fallback"]')).toBe("BS");
    expect(await textoDe("figure + p")).toBe(
      "Exemplo: o seu primeiro certificado sai assim"
    );
  });
});
