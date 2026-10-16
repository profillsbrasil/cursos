// A largura do extrato e de Sua semana no Chromium headless, dentro da casca de
// verdade (sidebar aberta, a Moldura do md para cima), com o CSS real do app.

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import type { ResumoAluno } from "@cursos/api/dominio/painel";
import type { DiaISO } from "@cursos/api/dominio/tipos";
import { Sidebar, SidebarInset } from "@cursos/ui/components/sidebar";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ProvedorDaCasca } from "@/components/casca/provedor-da-casca";
import { SuaSemana } from "@/components/meus-cursos/sua-semana";

import {
  abrirChromium,
  avaliar,
  CHROMIUM,
  cssDoApp,
  type Enviar,
  fecharChromium,
} from "../chromium-de-teste";
import { CursosParaTrocar } from "./cursos-para-trocar";

const naCasca = (conteudo: ReactNode) =>
  renderToStaticMarkup(
    <ProvedorDaCasca aberta>
      <Sidebar collapsible="icon" variant="sidebar">
        <span>menu</span>
      </Sidebar>
      <SidebarInset>
        <div className="min-w-0 px-[clamp(1rem,4vw,3rem)] pt-8 pb-16">
          {conteudo}
        </div>
      </SidebarInset>
    </ProvedorDaCasca>
  );

const dia = (d: string) => d as DiaISO;

const TROCAR = naCasca(
  <div className="grid gap-10">
    <CursosParaTrocar
      cartoes={[]}
      extrato={[
        {
          dia: dia("2026-10-14"),
          id: "l-1",
          pontos: 10,
          texto: "Aula assistida: Pilar Urgência, aula 4",
        },
        {
          dia: dia("2026-10-13"),
          id: "l-2",
          pontos: -300,
          texto: "Troca: Limpeza CIP e troca de formato",
        },
      ]}
      hoje="2026-10-14"
      temCursoTrocavelNaVitrine={false}
      voltarAEstudar="/meus-cursos"
    />
  </div>
);

const RESUMO: ResumoAluno = {
  bonus: 30,
  dias: ["S", "T", "Q", "Q", "S", "S", "D"].map((sigla, i) => ({
    dia: dia(`2026-10-1${2 + i}`),
    nome: `dia ${i}`,
    sigla,
    status: i < 2 ? "estudou" : "futuro",
  })),
  faltamParaBonus: 5,
  pontosSemana: 20,
  saldo: 610,
  sequenciaDias: 2,
};

// A grade de cima de Meus cursos: o banner e Sua semana.
const SEMANA = naCasca(
  <div className="grid items-stretch gap-5 min-[1181px]:grid-cols-[minmax(0,1fr)_320px]">
    <div className="h-40 rounded-[20px] bg-card" data-teste="banner" />
    <SuaSemana resumo={RESUMO} temCursoTrocavelNaVitrine={false} />
  </div>
);

const CLASSES = /class="([^"]*)"/g;
const ESPACO = /\s+/;
const css = await cssDoApp(
  [TROCAR, SEMANA].flatMap((html) =>
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

const largura = (seletor: string) =>
  avaliar<number>(
    enviar,
    `Math.round(document.querySelector(${JSON.stringify(seletor)}).getBoundingClientRect().width)`
  );

const conteudo = () =>
  avaliar<number>(
    enviar,
    `Math.round(document.querySelector('[data-slot="sidebar-inset"] > div').clientWidth - 2 * parseFloat(getComputedStyle(document.querySelector('[data-slot="sidebar-inset"] > div')).paddingLeft))`
  );

describe.skipIf(!existsSync(CHROMIUM))("largura de leitura", () => {
  beforeAll(async () => {
    enviar = await abrirChromium("largura-de-leitura");
  }, 20_000);

  afterAll(fecharChromium);

  const EXTRATO = '[aria-labelledby="extrato-recente"]';
  const SUA_SEMANA = '[aria-labelledby="semana-titulo"]';

  for (const janela of [1920, 1280]) {
    test(`${janela} px: o extrato para em 768 px, e Sua semana fica na coluna de 320 px`, async () => {
      await abrir(janela, TROCAR);
      expect(await conteudo()).toBeGreaterThan(768);
      expect(await largura(EXTRATO)).toBe(768);
      expect(await largura(`${EXTRATO} ul`)).toBe(768);
      await abrir(janela, SEMANA);
      expect(await largura(SUA_SEMANA)).toBe(320);
    });
  }

  test("1180 px, uma coluna: Sua semana para em 768 px, como o extrato", async () => {
    await abrir(1180, SEMANA);
    expect(await conteudo()).toBe(828);
    expect(await largura(SUA_SEMANA)).toBe(768);
  });

  test("390 px: os dois ocupam a largura do conteúdo", async () => {
    await abrir(390, TROCAR);
    const area = await conteudo();
    expect(await largura(`${EXTRATO} ul`)).toBe(area);
    await abrir(390, SEMANA);
    expect(await largura(SUA_SEMANA)).toBe(area);
  });
});
