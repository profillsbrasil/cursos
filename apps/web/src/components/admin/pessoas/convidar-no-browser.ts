// O diálogo de convidar empacotado para o Chromium dos testes, com o servidor, a
// navegação, o link e o toast falsos. Só os testes importam este módulo.

import { join } from "node:path";
import { build } from "bun";

const ENTRADA = join(import.meta.dir, "convidar.entrada.tsx");
const TRPC = join(import.meta.dir, "trpc-convite-falso.js");
const NAVEGACAO = join(import.meta.dir, "navegacao-convite-falsa.js");
const LINK = join(import.meta.dir, "link-convite-falso.jsx");
const TOAST = join(import.meta.dir, "toast-convite-falso.js");

const FALSOS: [RegExp, string][] = [
  [/^@\/utils\/trpc$/, TRPC],
  [/^next\/navigation$/, NAVEGACAO],
  [/^next\/link$/, LINK],
  [/^sonner$/, TOAST],
];

/**
 * O falso grava cada pedido em window.chamadas e responde com
 * window.resposta(pedido); sem ela, todo e-mail sai. O toast vai para
 * window.toasts.
 */
export async function empacotarConvidar() {
  const pacote = await build({
    define: { "process.env.NODE_ENV": '"development"' },
    entrypoints: [ENTRADA],
    files: {
      [ENTRADA]: `
        import { flushSync } from "react-dom";
        import { createRoot } from "react-dom/client";
        import { Convidar } from "./convidar";
        const CURSOS = [
          { id: "c1", status: "publicado", titulo: "Envase" },
          { id: "c2", status: "em_producao", titulo: "Rotulagem" },
        ];
        window.chamadas = [];
        window.toasts = [];
        flushSync(() => createRoot(document.getElementById("raiz")).render(<Convidar cursos={CURSOS} />));
      `,
      [TRPC]: `
        export const trpcClient = { admin: { convites: { enviar: { mutate: async (pedido) => {
          window.chamadas.push(pedido);
          await new Promise((r) => setTimeout(r, 30));
          return window.resposta
            ? window.resposta(pedido)
            : { convites: pedido.emails.map((email) => ({ email, tipo: "enviado" })) };
        } } } } };
      `,
      [NAVEGACAO]:
        "export const useRouter = () => ({ refresh: () => undefined });",
      [LINK]: `
        export default function Link({ href, ...resto }) {
          return <a href={href} {...resto} />;
        }
      `,
      [TOAST]: `
        export const toast = {
          error: (texto) => window.toasts.push("erro: " + texto),
          success: (texto) => window.toasts.push(texto),
        };
      `,
    },
    format: "iife",
    plugins: [
      {
        name: "falsos",
        setup(b) {
          for (const [filtro, caminho] of FALSOS) {
            b.onResolve({ filter: filtro }, () => ({ path: caminho }));
          }
        },
      },
    ],
    target: "browser",
  });
  const [saida] = pacote.outputs;
  if (!(pacote.success && saida)) {
    throw new Error(pacote.logs.join("\n"));
  }
  return saida.text();
}

/**
 * Funções da página: escrevem no campo pelo setter nativo (o React lê o evento
 * input), colam pelo evento paste e leem o diálogo como a pessoa o vê.
 */
export const AJUDANTES_DO_CONVIDAR = `
  window.esperar = (ms) => new Promise((r) => setTimeout(r, ms));
  window.dialogo = () => document.querySelector('[role="dialog"]');
  window.botaoCom = (onde, texto) => {
    const alvo = [...onde.querySelectorAll("button")].find((b) => (b.getAttribute("aria-label") ?? b.textContent.trim()) === texto);
    if (!alvo) throw new Error("sem o botão " + texto);
    return alvo;
  };
  window.abrir = async () => { botaoCom(document, "Convidar").click(); await esperar(50); };
  window.escrever = async (valor) => {
    const campo = dialogo().querySelector('input[inputmode="email"]');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setter.call(campo, valor);
    campo.dispatchEvent(new Event("input", { bubbles: true }));
    await esperar(0);
  };
  window.colar = async (valor) => {
    const dados = new DataTransfer();
    dados.setData("text/plain", valor);
    dialogo().querySelector('input[inputmode="email"]').dispatchEvent(
      new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: dados })
    );
    await esperar(0);
  };
  window.fichas = () => [...dialogo().querySelectorAll('ul[aria-label="E-mails escritos"] li')].map((li) => li.querySelector("span").textContent);
  window.enviar = () => {
    const b = dialogo().querySelector('button[type="submit"]');
    return { desligado: b.getAttribute("aria-disabled") === "true", texto: b.textContent.trim() };
  };
  window.clicarEmEnviar = async () => { dialogo().querySelector('button[type="submit"]').click(); await esperar(200); };
`;
