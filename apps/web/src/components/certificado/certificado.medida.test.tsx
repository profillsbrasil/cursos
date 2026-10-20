import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  CertificadoEmitido,
  PaginaDoCertificado,
} from "@cursos/api/dominio/pagina-do-certificado";
import type { DiaISO } from "@cursos/api/dominio/tipos";
import { renderToStaticMarkup } from "react-dom/server";

import { LARGURAS_DA_SIDEBAR } from "@/components/casca/nav";

import {
  abrirChromium,
  avaliar,
  CHROMIUM,
  cssDoApp,
  type Enviar,
  fecharChromium,
} from "../chromium-de-teste";
import {
  CORPO_DA_CONFERENCIA,
  ReciboDaConferencia,
  SemCertificado,
} from "./conferencia";
import { enderecoDaConferencia, folhaDo } from "./folha";
import { FolhaNaTela } from "./folha-na-tela";
import { NOMES_DA_FOLHA } from "./nomes-de-teste";
import { TelaDoCertificado } from "./tela-do-certificado";

const HOJE = "2026-10-16" as DiaISO;
const ANA: CertificadoEmitido = {
  codigo: "7K3M-Q9TD",
  emitidoEm: "2026-10-14T15:00:00Z",
  horas: 2,
  nome: "Ana Souza",
  tituloDoCurso: "Fábrica e montagem",
};
const LONGO: CertificadoEmitido = {
  ...ANA,
  nome: "Maria Aparecida dos Santos Albuquerque Figueiredo",
  tituloDoCurso:
    "Operação, ajuste, limpeza e manutenção preventiva da envasadora volumétrica pneumática de pistão para produtos pastosos e líquidos",
};
const emitido = (certificado: CertificadoEmitido): PaginaDoCertificado => ({
  categoria: "Produção e montagem",
  certificado,
  slug: "fabrica-e-montagem",
  tipo: "emitido",
});

const tela = (pagina: PaginaDoCertificado) =>
  renderToStaticMarkup(
    <TelaDoCertificado
      hoje={HOJE}
      origem="https://cursos.exemplo.com.br"
      pagina={pagina}
    />
  );

const PENDENTE: PaginaDoCertificado = {
  aulas: { feitas: 3, total: 7 },
  curso: { slug: "fabrica-e-montagem", titulo: "Fábrica e montagem" },
  questionarios: { aprovados: 1, total: 3 },
  tipo: "falta",
};

const TELAS = {
  emitido: tela(emitido(ANA)),
  longo: tela(emitido(LONGO)),
  naoAchou: renderToStaticMarkup(
    <div className={CORPO_DA_CONFERENCIA}>
      <SemCertificado digitado="7K3M-Q9TX" />
    </div>
  ),
  pendente: tela(PENDENTE),
  recibo: renderToStaticMarkup(
    <div className={CORPO_DA_CONFERENCIA}>
      <ReciboDaConferencia certificado={ANA} hoje={HOJE} />
    </div>
  ),
};

const CLASSES = /class="([^"]*)"/g;
const ESPACO = /\s+/;
const css = await cssDoApp(
  Object.values(TELAS).flatMap((html) =>
    [...html.matchAll(CLASSES)].flatMap(([, c = ""]) => c.split(ESPACO))
  )
);

const GEIST = ["Regular", "Medium", "SemiBold", "Bold"]
  .map(
    (peso, i) =>
      `@font-face{font-family:Geist;font-weight:${400 + i * 100};src:url(data:font/ttf;base64,${readFileSync(join(import.meta.dir, "fontes", `Geist-${peso}.ttf`)).toString("base64")}) format("truetype")}`
  )
  .join("");

const folhaCom = (nome: string) =>
  renderToStaticMarkup(
    <div style={{ width: 1123 }}>
      <FolhaNaTela
        folha={folhaDo(
          { ...LONGO, nome },
          enderecoDaConferencia("https://cursos.exemplo.com.br", LONGO.codigo)
        )}
      />
    </div>
  );

let enviar: Enviar;

const DO_ALUNO = {
  390: "padding:20px 16px 48px",
  1280: `margin-left:${LARGURAS_DA_SIDEBAR["--sidebar-width"]};padding:32px 48px 64px`,
};
const DA_CONFERENCIA = "";

async function abrir(largura: 390 | 1280, corpo: string, estilo: string) {
  await enviar("Emulation.setDeviceMetricsOverride", {
    deviceScaleFactor: 1,
    height: 800,
    mobile: false,
    width: largura,
  });
  await avaliar(
    enviar,
    `document.open(); document.write(${JSON.stringify(
      `<!doctype html><html class="dark" lang="pt-BR"><head><style>${css}</style></head><body style="margin:0"><main style="${estilo}">${corpo}</main></body></html>`
    )}); document.close();`
  );
}

interface Caixa {
  direita: number;
  esquerda: number;
  largura: number;
  pe: number;
  topo: number;
}

const CAIXA = `(el) => {
  const r = el.getBoundingClientRect();
  return { direita: Math.round(r.right), esquerda: Math.round(r.left), largura: Math.round(r.width), pe: Math.round(r.bottom), topo: Math.round(r.top) };
}`;

const medir = <T,>(corpo: string) =>
  avaliar<T>(enviar, `(() => { const caixa = ${CAIXA}; ${corpo} })()`);

const DA_TELA = `
  const folha = document.querySelector("figure");
  const [faixa, centro, pe] = folha.firstElementChild.children;
  return {
    altura: Math.round(folha.getBoundingClientRect().height),
    cartao: caixa(document.querySelector('[aria-label="Dados do certificado"]')),
    centro: [...centro.children].map(caixa),
    faixa: caixa(faixa),
    folha: caixa(folha),
    pe: caixa(pe),
    rolagem: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };`;

interface DaTela {
  altura: number;
  cartao: Caixa;
  centro: Caixa[];
  faixa: Caixa;
  folha: Caixa;
  pe: Caixa;
  rolagem: number;
}

describe.skipIf(!existsSync(CHROMIUM))("as telas do certificado", () => {
  beforeAll(async () => {
    enviar = await abrirChromium("certificado");
  }, 20_000);

  afterAll(fecharChromium);

  test("1280 px: a folha em A4 paisagem e o cartão de 300 px ao lado, a 32 px", async () => {
    await abrir(1280, TELAS.emitido, DO_ALUNO[1280]);
    const m = await medir<DaTela>(DA_TELA);
    expect(m.cartao.largura).toBe(300);
    expect(m.cartao.topo).toBe(m.folha.topo);
    expect(m.cartao.esquerda - m.folha.direita).toBe(32);
    expect(Math.abs(m.altura - (m.folha.largura * 794) / 1123)).toBeLessThan(1);
  });

  test("390 px: a folha e o cartão na largura do conteúdo, um embaixo do outro, sem rolagem de lado", async () => {
    await abrir(390, TELAS.emitido, DO_ALUNO[390]);
    const m = await medir<DaTela>(DA_TELA);
    expect(m.folha.esquerda).toBe(16);
    expect(m.cartao.esquerda).toBe(16);
    expect(m.cartao.largura).toBe(m.folha.largura);
    expect(m.cartao.topo - m.folha.pe).toBe(32);
    expect(m.rolagem).toBe(0);
  });

  const DO_PENDENTE = `
    const cartao = document.querySelector('[aria-labelledby="certificado-pendente"]');
    const lugar = cartao.parentElement.firstElementChild;
    return {
      cartao: caixa(cartao),
      lugar: caixa(lugar),
      lugarAltura: Math.round(lugar.getBoundingClientRect().height),
      rolagem: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };`;

  interface DoPendente {
    cartao: Caixa;
    lugar: Caixa;
    lugarAltura: number;
    rolagem: number;
  }

  test("1280 px, sem certificado: o lugar da folha em A4 e o cartão do que falta ao lado", async () => {
    await abrir(1280, TELAS.pendente, DO_ALUNO[1280]);
    const m = await medir<DoPendente>(DO_PENDENTE);
    expect(m.cartao.largura).toBe(300);
    expect(m.cartao.topo).toBe(m.lugar.topo);
    expect(m.cartao.esquerda - m.lugar.direita).toBe(32);
    expect(
      Math.abs(m.lugarAltura - (m.lugar.largura * 794) / 1123)
    ).toBeLessThan(1);
  });

  test("390 px, sem certificado: o lugar da folha e o cartão um embaixo do outro, sem rolagem de lado", async () => {
    await abrir(390, TELAS.pendente, DO_ALUNO[390]);
    const m = await medir<DoPendente>(DO_PENDENTE);
    expect(m.lugar.esquerda).toBe(16);
    expect(m.cartao.largura).toBe(m.lugar.largura);
    expect(m.cartao.topo - m.lugar.pe).toBe(32);
    expect(m.rolagem).toBe(0);
  });

  test.each([
    [1280, TELAS.emitido],
    [1280, TELAS.longo],
    [390, TELAS.longo],
  ] as const)(
    "%p px: o texto do meio da folha fica entre a faixa e o pé",
    async (largura, corpo) => {
      await abrir(largura, corpo, DO_ALUNO[largura]);
      const m = await medir<DaTela>(DA_TELA);
      expect(m.centro[0]?.topo ?? 0).toBeGreaterThan(m.faixa.pe);
      expect(m.centro.at(-1)?.pe ?? Number.POSITIVE_INFINITY).toBeLessThan(
        m.pe.topo
      );
    }
  );

  const DO_NOME = `
    const folha = document.querySelector("figure");
    const [faixa, centro, pe] = folha.firstElementChild.children;
    const [abre, nome] = centro.children;
    const trecho = document.createRange();
    trecho.selectNodeContents(nome);
    return {
      abre: caixa(abre),
      centro: caixa(centro),
      faixa: caixa(faixa),
      linhas: [...trecho.getClientRects()].map((r) => caixa({ getBoundingClientRect: () => r })),
      pe: caixa(pe),
      texto: nome.textContent,
      ultimo: caixa(centro.lastElementChild),
    };`;

  interface DoNome {
    abre: Caixa;
    centro: Caixa;
    faixa: Caixa;
    linhas: Caixa[];
    pe: Caixa;
    texto: string;
    ultimo: Caixa;
  }

  test.each(NOMES_DA_FOLHA)(
    "folha de 1123 px em Geist, %s: o nome entre a faixa e o pé, dentro das margens, inteiro ou cortado com reticências",
    async (_, nome) => {
      await abrir(1280, folhaCom(nome), "");
      const carregou = await avaliar<boolean>(
        enviar,
        `(async () => {
          const estilo = document.createElement("style");
          estilo.textContent = ${JSON.stringify(GEIST)};
          document.head.append(estilo);
          document.documentElement.style.setProperty("--font-geist-sans", "Geist");
          await Promise.all([400, 500, 600, 700].map((peso) => document.fonts.load(peso + " 16px Geist")));
          return document.fonts.check("700 16px Geist");
        })()`
      );
      expect(carregou).toBe(true);
      const m = await medir<DoNome>(DO_NOME);
      expect(m.abre.topo).toBeGreaterThan(m.faixa.pe);
      expect(m.ultimo.pe).toBeLessThanOrEqual(m.pe.topo);
      expect(m.linhas.length).toBeGreaterThan(0);
      for (const linha of m.linhas) {
        expect(linha.topo).toBeGreaterThanOrEqual(m.abre.pe);
        expect(linha.esquerda).toBeGreaterThanOrEqual(m.centro.esquerda);
        expect(linha.direita).toBeLessThanOrEqual(m.centro.direita);
      }
      const lido = m.texto.replaceAll("\u00ad", "");
      if (lido !== nome) {
        expect(lido.endsWith("…")).toBe(true);
        expect(nome.startsWith(lido.slice(0, -1))).toBe(true);
      }
    }
  );

  test("390 px: o recibo da conferência ocupa a largura, sem rolagem de lado", async () => {
    await abrir(390, TELAS.recibo, DA_CONFERENCIA);
    const m = await medir<{ recibo: Caixa; rolagem: number }>(
      `return { recibo: caixa(document.querySelector("section")), rolagem: document.documentElement.scrollWidth - document.documentElement.clientWidth };`
    );
    expect(m.recibo.esquerda).toBe(16);
    expect(m.recibo.largura).toBeGreaterThan(340);
    expect(m.rolagem).toBe(0);
  });

  test("1280 px: o recibo fica estreito, em 440 px, no meio", async () => {
    await abrir(1280, TELAS.recibo, DA_CONFERENCIA);
    const m = await medir<{ recibo: Caixa }>(
      `return { recibo: caixa(document.querySelector("section")) };`
    );
    expect(m.recibo.largura).toBe(440);
    expect(m.recibo.esquerda).toBe((1280 - 440) / 2);
  });

  test("390 px: o campo e o Conferir dividem a linha, sem rolagem de lado", async () => {
    await abrir(390, TELAS.naoAchou, DA_CONFERENCIA);
    const m = await medir<{ botao: Caixa; campo: Caixa; rolagem: number }>(
      `return { botao: caixa(document.querySelector("form button")), campo: caixa(document.querySelector("form input")), rolagem: document.documentElement.scrollWidth - document.documentElement.clientWidth };`
    );
    expect(m.botao.topo).toBe(m.campo.topo);
    expect(m.campo.largura).toBeGreaterThan(150);
    expect(m.rolagem).toBe(0);
  });
});
