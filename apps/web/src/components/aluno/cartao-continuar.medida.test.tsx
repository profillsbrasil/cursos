import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test";
import { existsSync } from "node:fs";
import { Sidebar } from "@cursos/ui/components/sidebar";
import type { Route } from "next";
import { renderToStaticMarkup } from "react-dom/server";

import { ProvedorDaCasca } from "@/components/casca/provedor-da-casca";

import {
  abrirChromium,
  avaliar,
  CHROMIUM,
  cssDoApp,
  type Enviar,
  fecharChromium,
} from "../chromium-de-teste";
import type { Continuar } from "./continuar";

const navegacao = await import("next/navigation");
mock.module("next/navigation", () => ({
  ...navegacao,
  usePathname: () => "/meus-cursos",
}));

const { CartaoContinuar } = await import("./cartao-continuar");

const COMECAR: Continuar = {
  chamada: "Começar curso",
  chamadaAqui: "Assistindo agora",
  href: "/cursos/fabrica/aulas/a1" as Route,
  pct: null,
  rotulo: "Começar curso: Filmagem da instalação",
  tipo: "comecar",
  titulo: "Filmagem da instalação",
};

const CONTINUAR: Continuar = { ...COMECAR, chamada: "Continuar", pct: 51 };

function cumprida<T>(valor: T): Promise<T> {
  return Object.assign(Promise.resolve(valor), {
    status: "fulfilled",
    value: valor,
  });
}

const naSidebar = (cartao: Promise<Continuar | null>) =>
  renderToStaticMarkup(
    <ProvedorDaCasca aberta>
      <Sidebar collapsible="icon" variant="sidebar">
        <div className="p-3.5">
          <CartaoContinuar cartao={cartao} />
        </div>
      </Sidebar>
    </ProvedorDaCasca>
  );

const CARTOES = {
  comecar: naSidebar(cumprida(COMECAR)),
  continuar: naSidebar(cumprida(CONTINUAR)),
  esqueleto: naSidebar(new Promise<null>(() => undefined)),
};

const CLASSES = /class="([^"]*)"/g;
const ESPACO = /\s+/;
const css = await cssDoApp(
  Object.values(CARTOES).flatMap((html) =>
    [...html.matchAll(CLASSES)].flatMap(([, c = ""]) => c.split(ESPACO))
  )
);

let enviar: Enviar;

interface Medida {
  abaixo: number;
  acima: number;
  altura: number;
}

async function medir(corpo: string) {
  await enviar("Emulation.setDeviceMetricsOverride", {
    deviceScaleFactor: 1,
    height: 900,
    mobile: false,
    width: 1280,
  });
  await avaliar(
    enviar,
    `document.open(); document.write(${JSON.stringify(
      `<!doctype html><html class="dark" lang="pt-BR"><head><style>${css}</style></head><body style="margin:0">${corpo}</body></html>`
    )}); document.close();`
  );
  return avaliar<Medida>(
    enviar,
    `(() => {
      const cartao = document.querySelector("[data-sidebar=content], [data-slot=sidebar-inner]").querySelector("a, [aria-hidden=true].grid");
      const miolo = cartao.querySelector("span > span").getBoundingClientRect();
      const c = cartao.getBoundingClientRect();
      return { altura: Math.round(c.height), acima: Math.round(miolo.top - c.top), abaixo: Math.round(c.bottom - miolo.bottom) };
    })()`
  );
}

describe.skipIf(!existsSync(CHROMIUM))("o Continuar da sidebar medido", () => {
  beforeAll(async () => {
    enviar = await abrirChromium("continuar");
  }, 20_000);

  afterAll(fecharChromium);

  test("Começar curso, sem barra: o miolo fica no meio do cartão", async () => {
    const m = await medir(CARTOES.comecar);
    expect(m.acima).toBe(m.abaixo);
  });

  test("o cartão mede o mesmo com barra, sem barra e no esqueleto", async () => {
    const comecar = await medir(CARTOES.comecar);
    const continuar = await medir(CARTOES.continuar);
    const esqueleto = await medir(CARTOES.esqueleto);
    expect(comecar.altura).toBe(continuar.altura);
    expect(esqueleto.altura).toBe(continuar.altura);
  });
});
