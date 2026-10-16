import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { Sidebar, SidebarInset } from "@cursos/ui/components/sidebar";
import type { ReactNode } from "react";
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
import { ALUNA, NOVO } from "./exemplo-de-teste";
import { TelaDeConquistas } from "./tela-de-conquistas";

const naCasca = (filhos: ReactNode) =>
  renderToStaticMarkup(
    <ProvedorDaCasca aberta>
      <Sidebar collapsible="icon" variant="sidebar">
        <span>menu</span>
      </Sidebar>
      <SidebarInset>
        <div className="min-w-0 px-[clamp(1rem,4vw,3rem)] pt-8 pb-16">
          {filhos}
        </div>
      </SidebarInset>
    </ProvedorDaCasca>
  );

const TELAS = {
  aluna: naCasca(<TelaDeConquistas conquistas={ALUNA} />),
  novo: naCasca(<TelaDeConquistas conquistas={NOVO} />),
};

const CLASSES = /class="([^"]*)"/g;
const ESPACO = /\s+/;
const css = await cssDoApp(
  Object.values(TELAS).flatMap((html) =>
    [...html.matchAll(CLASSES)].flatMap(([, c = ""]) => c.split(ESPACO))
  )
);

let enviar: Enviar;

async function abrir(largura: number, corpo: string) {
  await enviar("Emulation.setDeviceMetricsOverride", {
    deviceScaleFactor: 1,
    height: 900,
    mobile: false,
    width: largura,
  });
  await avaliar(
    enviar,
    `document.open(); document.write(${JSON.stringify(
      `<!doctype html><html class="dark" lang="pt-BR"><head><style>${css}</style></head><body style="margin:0">${corpo}</body></html>`
    )}); document.close(); window.scrollTo(0, 0);`
  );
}

interface Caixa {
  altura: number;
  esquerda: number;
  fundo: number;
  largura: number;
  topo: number;
}

const linhasDe = (idDoTitulo: string) =>
  avaliar<{ estado: Caixa; figura: Caixa; nome: Caixa }[]>(
    enviar,
    `[...document.querySelectorAll('[aria-labelledby="${idDoTitulo}"] ol > li')].map((li) => {
      const caixa = (el) => {
        const r = el.getBoundingClientRect();
        return { altura: Math.round(r.height), esquerda: Math.round(r.left), fundo: Math.round(r.bottom), largura: Math.round(r.width), topo: Math.round(r.top) };
      };
      const [figura, nome, estado] = li.children;
      return { estado: caixa(estado), figura: caixa(figura), nome: caixa(nome) };
    })`
  );

const rolaDeLado = () =>
  avaliar<boolean>(
    enviar,
    "document.documentElement.scrollWidth > document.documentElement.clientWidth"
  );

describe.skipIf(!existsSync(CHROMIUM))("a tela Conquistas medida", () => {
  beforeAll(async () => {
    enviar = await abrirChromium("conquistas");
  }, 20_000);

  afterAll(fecharChromium);

  for (const [nome, tela] of Object.entries(TELAS)) {
    test(`1280 px, ${nome}: medalha de 48 px, nome no meio e o estado na coluna de 220 px`, async () => {
      await abrir(1280, tela);
      const marcos = await linhasDe("conquistas-marcos");
      expect(marcos).toHaveLength(7);
      for (const l of marcos) {
        expect([l.figura.largura, l.figura.altura]).toEqual([48, 48]);
        expect(l.estado.largura).toBe(220);
        expect(l.estado.esquerda).toBeGreaterThanOrEqual(
          l.nome.esquerda + l.nome.largura
        );
      }
      for (const l of await linhasDe("conquistas-certificados")) {
        expect([l.figura.largura, l.figura.altura]).toEqual([72, 48]);
        expect(l.estado.largura).toBe(220);
      }
      expect(await rolaDeLado()).toBe(false);
    });

    test(`390 px, ${nome}: o estado desce para baixo do nome, sem rolar de lado`, async () => {
      await abrir(390, tela);
      for (const idDoTitulo of [
        "conquistas-marcos",
        "conquistas-certificados",
      ]) {
        for (const l of await linhasDe(idDoTitulo)) {
          expect(l.estado.topo).toBeGreaterThanOrEqual(l.nome.fundo);
          expect(l.estado.esquerda).toBe(l.nome.esquerda);
        }
      }
      const [capa] = await linhasDe("conquistas-certificados");
      expect(capa?.figura.largura).toBe(56);
      expect(await rolaDeLado()).toBe(false);
    });
  }
});
