// Só dos testes: o CSS real do app, compilado pelo Tailwind, e o Chromium da
// máquina guiado pelo protocolo do DevTools. Sem Chromium, a suíte que depende
// dele pula (`describe.skipIf(!existsSync(CHROMIUM))`).

import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawn } from "bun";
import { compile } from "tailwindcss";

const APP = join(import.meta.dir, "../..");
const UI = join(APP, "../../packages/ui");
const INDEX = join(APP, "src/index.css");

const ESTILOS: Record<string, string> = {
  "@cursos/ui/globals.css": join(UI, "src/styles/globals.css"),
  "shadcn/tailwind.css": join(UI, "node_modules/shadcn/dist/tailwind.css"),
  tailwindcss: join(UI, "node_modules/tailwindcss/index.css"),
  "tw-animate-css": join(UI, "node_modules/tw-animate-css/dist/tw-animate.css"),
};

function lerEstilo(id: string, base: string) {
  const caminho = ESTILOS[id] ?? join(base, id);
  return Promise.resolve({
    base: dirname(caminho),
    content: readFileSync(caminho, "utf8"),
    path: caminho,
  });
}

/** O index.css do app, com o globals.css do packages/ui, para as classes pedidas. */
export async function cssDoApp(classes: Iterable<string>) {
  const compilador = await compile(readFileSync(INDEX, "utf8"), {
    base: dirname(INDEX),
    loadStylesheet: lerEstilo,
  });
  return compilador.build([...new Set(classes)]);
}

export const CHROMIUM = process.env.CHROMIUM ?? "/usr/bin/chromium";
const DEVTOOLS = /DevTools listening on (ws:\/\/\S+)/;

interface Resposta {
  error?: { message: string };
  id?: number;
  result?: Record<string, unknown>;
}

async function enderecoDoDevTools(saida: ReadableStream<Uint8Array>) {
  const decodificador = new TextDecoder();
  let lido = "";
  for await (const pedaco of saida) {
    lido += decodificador.decode(pedaco);
    const achado = DEVTOOLS.exec(lido)?.[1];
    if (achado) {
      return achado;
    }
  }
  throw new Error(`o Chromium não abriu o DevTools:\n${lido}`);
}

/** O que o fecharChromium desfaz, na ordem inversa: vale também se o setup cair no meio. */
const limpezas: (() => unknown)[] = [];

const TETO_DO_WEBSOCKET_MS = 5000;

function abrirWebSocket(url: string) {
  const ws = new WebSocket(url);
  limpezas.push(() => ws.close());
  return new Promise<WebSocket>((pronto, falhou) => {
    const teto = setTimeout(
      () =>
        falhou(
          new Error(
            `o WebSocket do DevTools não abriu em ${TETO_DO_WEBSOCKET_MS} ms`
          )
        ),
      TETO_DO_WEBSOCKET_MS
    );
    ws.addEventListener("open", () => {
      clearTimeout(teto);
      pronto(ws);
    });
    ws.addEventListener("error", () => {
      clearTimeout(teto);
      falhou(new Error(`o WebSocket do DevTools falhou em ${url}`));
    });
  });
}

export type Enviar = (
  method: string,
  params?: Record<string, unknown>
) => Promise<Record<string, unknown>>;

export async function abrirChromium(prefixo: string): Promise<Enviar> {
  const perfil = mkdtempSync(join(tmpdir(), `${prefixo}-`));
  limpezas.push(() => rmSync(perfil, { force: true, recursive: true }));
  const processo = spawn(
    [
      CHROMIUM,
      "--headless",
      "--remote-debugging-port=0",
      `--user-data-dir=${perfil}`,
      "--no-first-run",
      // O headless se declara sem cursor; aqui ele tem um mouse (hover: hover).
      "--blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4",
      "about:blank",
    ],
    { stderr: "pipe", stdout: "ignore" }
  );
  limpezas.push(async () => {
    processo.kill();
    await processo.exited;
  });
  const navegador = new URL(await enderecoDoDevTools(processo.stderr));
  const alvos = (await (
    await fetch(`http://${navegador.host}/json/list`)
  ).json()) as { type: string; webSocketDebuggerUrl: string }[];
  const pagina = alvos.find((a) => a.type === "page");
  if (!pagina) {
    throw new Error("o Chromium abriu sem página");
  }
  const ws = await abrirWebSocket(pagina.webSocketDebuggerUrl);
  const pendentes = new Map<number, (r: Resposta) => void>();
  ws.addEventListener("message", (m) => {
    const resposta = JSON.parse(String(m.data)) as Resposta;
    if (resposta.id !== undefined) {
      pendentes.get(resposta.id)?.(resposta);
      pendentes.delete(resposta.id);
    }
  });
  let proximo = 0;
  return (method, params = {}) => {
    proximo += 1;
    const id = proximo;
    return new Promise<Record<string, unknown>>((resolve, reject) => {
      pendentes.set(id, (r) =>
        r.error
          ? reject(new Error(`${method}: ${r.error.message}`))
          : resolve(r.result ?? {})
      );
      ws.send(JSON.stringify({ id, method, params }));
    });
  };
}

/** Uma limpeza por vez: o perfil só sai depois que o processo terminou. */
export async function fecharChromium() {
  await limpezas
    .splice(0)
    .reverse()
    .reduce<Promise<unknown>>(
      (anterior, limpar) => anterior.then(limpar),
      Promise.resolve()
    );
}

/** Avalia a expressão na página e devolve o valor; espera a Promise, se houver. */
export async function avaliar<T>(enviar: Enviar, expressao: string) {
  const { exceptionDetails, result } = (await enviar("Runtime.evaluate", {
    awaitPromise: true,
    expression: expressao,
    returnByValue: true,
  })) as {
    exceptionDetails?: { exception?: { description?: string }; text: string };
    result: { value: T };
  };
  if (exceptionDetails) {
    throw new Error(
      exceptionDetails.exception?.description ?? exceptionDetails.text
    );
  }
  return result.value;
}
