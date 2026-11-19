import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { spawn } from "bun";
import { compile } from "tailwindcss";

import {
  ehBooleano,
  ehLista,
  ehNumero,
  ehObjeto,
  ehRegistro,
  ehTexto,
  opcional,
  type Predicado,
} from "./predicados.test-utils";

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

/** Só dos testes: o Chromium da máquina, guiado pelo protocolo do DevTools. Sem ele, a suíte que depende dele pula (`describe.skipIf(!existsSync(CHROMIUM))`). */
export const CHROMIUM = process.env.CHROMIUM ?? "/usr/bin/chromium";
const DEVTOOLS = /DevTools listening on (ws:\/\/\S+)/;

const ehMensagem = ehObjeto({
  error: opcional(ehObjeto({ message: ehTexto })),
  id: opcional(ehNumero),
  result: opcional(ehRegistro),
});

const ehAlvos = ehLista(
  ehObjeto({ type: ehTexto, webSocketDebuggerUrl: opcional(ehTexto) })
);

interface ValorDoAx {
  value?: string;
}

interface NoDaArvore {
  description?: ValorDoAx;
  ignored: boolean;
  name?: ValorDoAx;
  role?: ValorDoAx;
  value?: Record<string, unknown>;
}

interface Avaliacao {
  exceptionDetails?: {
    exception?: { description?: string };
    text: string;
  };
  result: Record<string, unknown>;
}

/** A resposta de cada método do protocolo que os testes usam. Quem não lê a resposta fica com o registro cru. */
interface Respostas {
  "Accessibility.getFullAXTree": { nodes: NoDaArvore[] };
  "Accessibility.getPartialAXTree": { nodes: NoDaArvore[] };
  "CSS.enable": Record<string, unknown>;
  "CSS.forcePseudoState": Record<string, unknown>;
  "DOM.enable": Record<string, unknown>;
  "DOM.getDocument": { root: { nodeId: number } };
  "DOM.querySelector": { nodeId: number };
  "Emulation.setDeviceMetricsOverride": Record<string, unknown>;
  "Emulation.setEmulatedMedia": Record<string, unknown>;
  "Emulation.setFocusEmulationEnabled": Record<string, unknown>;
  "Input.dispatchKeyEvent": Record<string, unknown>;
  "Input.dispatchMouseEvent": Record<string, unknown>;
  "Input.insertText": Record<string, unknown>;
  "Page.captureScreenshot": { data: string };
  "Page.enable": Record<string, unknown>;
  "Page.navigate": Record<string, unknown>;
  "Runtime.evaluate": Avaliacao;
}

const ehValorDoAx: Predicado<ValorDoAx> = ehObjeto({
  value: opcional(ehTexto),
});

const ehArvore = ehObjeto({
  nodes: ehLista(
    ehObjeto({
      description: opcional(ehValorDoAx),
      ignored: ehBooleano,
      name: opcional(ehValorDoAx),
      role: opcional(ehValorDoAx),
      value: opcional(ehRegistro),
    })
  ),
});

const RESPOSTAS: { [M in keyof Respostas]: Predicado<Respostas[M]> } = {
  "Accessibility.getFullAXTree": ehArvore,
  "Accessibility.getPartialAXTree": ehArvore,
  "CSS.enable": ehRegistro,
  "CSS.forcePseudoState": ehRegistro,
  "DOM.enable": ehRegistro,
  "DOM.getDocument": ehObjeto({ root: ehObjeto({ nodeId: ehNumero }) }),
  "DOM.querySelector": ehObjeto({ nodeId: ehNumero }),
  "Emulation.setDeviceMetricsOverride": ehRegistro,
  "Emulation.setEmulatedMedia": ehRegistro,
  "Emulation.setFocusEmulationEnabled": ehRegistro,
  "Input.dispatchKeyEvent": ehRegistro,
  "Input.dispatchMouseEvent": ehRegistro,
  "Input.insertText": ehRegistro,
  "Page.captureScreenshot": ehObjeto({ data: ehTexto }),
  "Page.enable": ehRegistro,
  "Page.navigate": ehRegistro,
  "Runtime.evaluate": ehObjeto({
    exceptionDetails: opcional(
      ehObjeto({
        exception: opcional(ehObjeto({ description: opcional(ehTexto) })),
        text: ehTexto,
      })
    ),
    result: ehRegistro,
  }),
};

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

export type Enviar = <M extends keyof Respostas>(
  method: M,
  params?: Record<string, unknown>
) => Promise<Respostas[M]>;

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

  const alvos: unknown = await (
    await fetch(`http://${navegador.host}/json/list`)
  ).json();

  if (!ehAlvos(alvos)) {
    throw new Error(
      `o Chromium listou alvos sem a forma do DevTools: ${JSON.stringify(alvos)}`
    );
  }

  const pagina = alvos.find((a) => a.type === "page")?.webSocketDebuggerUrl;

  if (!pagina) {
    throw new Error("o Chromium abriu sem página");
  }

  const ws = await abrirWebSocket(pagina);

  const pendentes = new Map<
    number,
    (r: {
      error?: { message: string };
      result?: Record<string, unknown>;
    }) => void
  >();

  ws.addEventListener("message", (m) => {
    const resposta: unknown = JSON.parse(String(m.data));

    if (!ehMensagem(resposta)) {
      throw new Error(
        `o DevTools mandou uma mensagem fora do protocolo: ${String(m.data)}`
      );
    }

    if (resposta.id !== undefined) {
      pendentes.get(resposta.id)?.(resposta);
      pendentes.delete(resposta.id);
    }
  });
  let proximo = 0;

  const pedir = (method: string, params: Record<string, unknown>) => {
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

  return async <M extends keyof Respostas>(
    method: M,
    params: Record<string, unknown> = {}
  ) => {
    const resultado = await pedir(method, params);
    const eh = RESPOSTAS[method];

    if (!eh(resultado)) {
      throw new Error(
        `${method} respondeu fora da forma esperada: ${JSON.stringify(resultado)}`
      );
    }

    return resultado;
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

/** Avalia a expressão na página e devolve o valor, ainda sem tipo; espera a Promise, se houver. */
export async function avaliar(enviar: Enviar, expressao: string) {
  const { exceptionDetails, result } = await enviar("Runtime.evaluate", {
    awaitPromise: true,
    expression: expressao,
    returnByValue: true,
  });

  if (exceptionDetails) {
    throw new Error(
      exceptionDetails.exception?.description ?? exceptionDetails.text
    );
  }

  return result.value;
}

/** Avalia como o `avaliar` e confere o valor pelo predicado: um valor fora da forma lança com o valor na mensagem. */
export async function avaliarComo<T>(
  enviar: Enviar,
  expressao: string,
  eh: Predicado<T>
) {
  const valor = await avaliar(enviar, expressao);

  if (!eh(valor)) {
    throw new Error(
      `a página devolveu ${JSON.stringify(valor)}, fora da forma esperada, para:\n${expressao}`
    );
  }

  return valor;
}
