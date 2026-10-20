import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import type { AulaNoPlayer } from "@cursos/api/dominio/aula";
import type { AulaId, DiaISO } from "@cursos/api/dominio/tipos";
import { SEM_TRECHOS } from "@cursos/api/dominio/trechos";
import { renderToStaticMarkup } from "react-dom/server";

import { Vazio } from "./admin/partes";
import { TelaNaoEncontrada } from "./aluno/tela-nao-encontrada";
import { TelaDeErro } from "./casca/tela-de-erro";
import { ReciboDaConferencia } from "./certificado/conferencia";
import { TelaDoCertificado } from "./certificado/tela-do-certificado";
import {
  abrirChromium,
  avaliar,
  CHROMIUM,
  cssDoApp,
  type Enviar,
  fecharChromium,
} from "./chromium-de-teste";
import { VARIOS, VAZIO } from "./comunicados-do-aluno/exemplo-de-teste";
import { TelaDeComunicados } from "./comunicados-do-aluno/tela-de-comunicados";
import { fabrica, HOJE } from "./curso/exemplo-de-teste";
import { TelaDoCurso } from "./curso/tela-do-curso";
import { CabecalhoDaAula } from "./player/cabecalho-da-aula";
import { CursosParaTrocar } from "./trocar-pontos/cursos-para-trocar";

const AULA: AulaNoPlayer = {
  anterior: null,
  aula: {
    descricao: "",
    duracaoSeg: 634,
    id: "a4" as AulaId,
    modulo: { numero: 8, titulo: "Pilar Urgência" },
    numeroNoModulo: 4,
    titulo: "Cronograma reverso",
    totalNoModulo: 8,
    video: null,
  },
  curso: {
    progresso: { feitas: 0, pct: 0, total: 8 },
    slug: "comercial",
    titulo: "Profills School Comercial",
  },
  estudo: { assistida: false, posicaoSeg: 0, trechos: SEM_TRECHOS },
  modulos: [],
  proxima: null,
  questionario: null,
};

const nadaFaz = () => undefined;

const PAGINA = renderToStaticMarkup(
  <div className="grid gap-10">
    <Vazio>Nenhum comunicado ainda.</Vazio>
    <CursosParaTrocar
      cartoes={[]}
      extrato={[]}
      hoje="2026-10-14"
      retomar={{ href: "/meus-cursos", icone: null, texto: "Ver Meus cursos" }}
      temCursoTrocavelNaVitrine={false}
    />
    <TelaDeComunicados comunicados={VARIOS} />
    <TelaDeComunicados comunicados={VAZIO} />
    <TelaNaoEncontrada texto="Frase da tela não encontrada." titulo="Sumiu" />
    <TelaDeErro
      error={new Error("x")}
      retry={nadaFaz}
      texto="Frase da tela de erro."
      titulo="Falhou"
    />
    <CabecalhoDaAula dados={AULA} />
    <TelaDoCurso hoje={HOJE} pagina={fabrica.emAndamento} />
    <TelaDoCertificado
      hoje={"2026-10-16" as DiaISO}
      origem="https://cursos.exemplo.com.br"
      pagina={{
        aulas: { feitas: 3, total: 7 },
        curso: { slug: "fabrica-e-montagem", titulo: "Fábrica e montagem" },
        questionarios: { aprovados: 1, total: 3 },
        tipo: "falta",
      }}
    />
    <ReciboDaConferencia
      certificado={{
        codigo: "7K3M-Q9TD",
        emitidoEm: "2026-10-14T15:00:00Z",
        horas: 2,
        nome: "Ana Souza",
        tituloDoCurso: "Fábrica e montagem",
      }}
      hoje={"2026-10-16" as DiaISO}
    />
  </div>
);

const CLASSES = /class="([^"]*)"/g;
const ESPACO = /\s+/;
const css = await cssDoApp(
  [...PAGINA.matchAll(CLASSES)].flatMap(([, c = ""]) =>
    c.replaceAll("&amp;", "&").split(ESPACO)
  )
);

let enviar: Enviar;

interface Letra {
  entrelinha: string;
  espacamento: string;
  numeros: string;
  tamanho: string;
}

/** A letra do elemento que segura o primeiro texto com o trecho pedido. */
const letraDe = (trecho: string) =>
  avaliar<Letra | null>(
    enviar,
    `(() => {
      const andar = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      while (andar.nextNode()) {
        if (andar.currentNode.textContent.includes(${JSON.stringify(trecho)})) {
          const s = getComputedStyle(andar.currentNode.parentElement);
          return { entrelinha: s.lineHeight, espacamento: s.letterSpacing, numeros: s.fontVariantNumeric, tamanho: s.fontSize };
        }
      }
      return null;
    })()`
  );

describe.skipIf(!existsSync(CHROMIUM))("a escala do texto", () => {
  beforeAll(async () => {
    enviar = await abrirChromium("escala-do-texto");
    await enviar("Emulation.setDeviceMetricsOverride", {
      deviceScaleFactor: 1,
      height: 900,
      mobile: false,
      width: 1280,
    });
    await avaliar(
      enviar,
      `document.open(); document.write(${JSON.stringify(
        `<!doctype html><html class="dark" lang="pt-BR"><head><style>${css}</style></head><body style="margin:0">${PAGINA}</body></html>`
      )}); document.close();`
    );
  }, 20_000);

  afterAll(fecharChromium);

  test.each([
    ["o Vazio do admin", "Nenhum comunicado ainda."],
    ["o extrato vazio", "Nenhum ponto ainda."],
    ["Cursos para trocar vazio", "Quando houver, ele aparece aqui."],
    ["Comunicados vazio", "Quando o admin publicar um aviso"],
    ["a tela não encontrada", "Frase da tela não encontrada."],
    ["a tela de erro", "Frase da tela de erro."],
  ])("a frase de estado vazio sai em 14 px: %s", async (_, trecho) => {
    expect((await letraDe(trecho))?.tamanho).toBe("14px");
  });

  test.each([
    ["a linha do módulo da aula", "Pilar Urgência · aula"],
    ["a contagem do cartão do curso", "aulas assistidas"],
    ["a contagem de Conteúdo do curso", "módulos ·"],
    ["a frase do certificado pendente", "Assista a todas as aulas"],
    ["a frase do recibo", "Certificamos que"],
  ])("o metadado sai em 14 px: %s", async (_, trecho) => {
    expect((await letraDe(trecho))?.tamanho).toBe("14px");
  });

  test("em Anteriores, o texto do comunicado fica um degrau abaixo do título", async () => {
    expect(
      (await letraDe("Checklist de bloqueio para levar ao posto"))?.tamanho
    ).toBe("16px");
    expect((await letraDe("ganhou o checklist da fábrica"))?.tamanho).toBe(
      "14px"
    );
  });

  test("o título da aula tem a entrelinha e a letra dos outros h1", async () => {
    expect(await letraDe("Cronograma reverso")).toMatchObject({
      entrelinha: "36px",
      espacamento: "-0.75px",
      tamanho: "30px",
    });
  });

  test("todo número herda os algarismos tabulares do body", async () => {
    expect((await letraDe("Nenhum comunicado ainda."))?.numeros).toBe(
      "tabular-nums"
    );
    expect((await letraDe("aulas assistidas"))?.numeros).toBe("tabular-nums");
  });
});
