// As ações em texto e a caixa de marcar desenham 20 px de altura, e no celular o
// toque erra. O teste abre os controles no Chromium headless em 390 px, com o CSS
// real do app, e mede até onde o toque ainda cai no controle, a partir do centro,
// pelo elementFromPoint. Sem Chromium na máquina, a suíte pula.

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import type { DiaISO } from "@cursos/api/dominio/tipos";
import { Checkbox } from "@cursos/ui/components/checkbox";
import { renderToStaticMarkup } from "react-dom/server";

import { ListaDePessoas } from "./admin/lista-de-pessoas";
import { ProvedorDoLote } from "./admin/provedor-do-lote";
import { CAIXA } from "./casca/campos";
import {
  abrirChromium,
  avaliar,
  CHROMIUM,
  cssDoApp,
  type Enviar,
  fecharChromium,
} from "./chromium-de-teste";
import { ConteudoDoCurso } from "./curso/conteudo-do-curso";
import { fabrica } from "./curso/exemplo-de-teste";
import {
  ACAO_NA_LINHA,
  CARTAO,
  LINHA,
  TEXTO_DA_LINHA,
} from "./minha-conta/partes";

const HOJE = "2026-10-14" as DiaISO;

const PAGINA = renderToStaticMarkup(
  <div className="grid gap-10 p-4">
    <ul className={CARTAO}>
      <li className={LINHA}>
        <span className={TEXTO_DA_LINHA}>Chrome no Linux</span>
        <button className={ACAO_NA_LINHA} id="sair" type="button">
          Sair
        </button>
      </li>
    </ul>
    <div className="flex flex-wrap gap-x-3.5 gap-y-1">
      <button className={ACAO_NA_LINHA} id="trocar-foto" type="button">
        Trocar foto
      </button>
      <button className={ACAO_NA_LINHA} id="remover" type="button">
        Remover
      </button>
    </div>
    <label className="flex items-start gap-2.5 text-[13px]" htmlFor="caixa">
      <Checkbox className={CAIXA} id="caixa" />
      Sair dos outros aparelhos
    </label>
    <ProvedorDoLote>
      <ListaDePessoas
        resultado={{
          hoje: HOJE,
          pessoas: [
            {
              ativas: [],
              email: "ana@exemplo.com",
              foto: null,
              nome: "Ana Exemplo",
              situacao: {
                desde: HOJE,
                numeros: { concluidos: 0, cursos: 1, emProducao: 0 },
                tipo: "nunca_abriu",
              },
              userId: "user_exemplo",
            },
          ],
          total: 1,
        }}
        termo=""
      />
    </ProvedorDoLote>
    <ConteudoDoCurso pagina={fabrica.emAndamento} />
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

/** Largura e altura da área em que o toque cai no elemento, medidas do centro dele. */
const alvoDe = (seletor: string) =>
  avaliar<{ altura: number; largura: number }>(
    enviar,
    `(() => {
      const el = document.querySelector(${JSON.stringify(seletor)});
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const cai = (x, y) => el.contains(document.elementFromPoint(x, y));
      const ate = (dx, dy) => {
        let n = 0;
        while (n < 80 && cai(cx + dx * (n + 1), cy + dy * (n + 1))) n++;
        return n;
      };
      return { altura: ate(0, -1) + ate(0, 1) + 1, largura: ate(-1, 0) + ate(1, 0) + 1 };
    })()`
  );

describe.skipIf(!existsSync(CHROMIUM))("o alvo de toque em 390 px", () => {
  beforeAll(async () => {
    enviar = await abrirChromium("alvo-de-toque");
    await enviar("Emulation.setDeviceMetricsOverride", {
      deviceScaleFactor: 1,
      height: 2400,
      mobile: true,
      width: 390,
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
    ["Sair do aparelho", "#sair"],
    ["Trocar foto", "#trocar-foto"],
    ["Remover", "#remover"],
    ["a caixa de marcar", "label [data-slot=checkbox]"],
    ["a caixa de Liberações", '[aria-label="Marcar Ana Exemplo"]'],
    ["o Abrir de Liberações", '[aria-label="Abrir Ana Exemplo"]'],
    ["Fechar todos", "#conteudo-do-curso + p button"],
  ])("%s recebe o toque em 44 por 44 px", async (_, seletor) => {
    const alvo = await alvoDe(seletor);
    expect(alvo.altura).toBeGreaterThanOrEqual(44);
    expect(alvo.largura).toBeGreaterThanOrEqual(44);
  });

  test("o toque entre Trocar foto e Remover não cai no vizinho", async () => {
    const lados = await avaliar<string[]>(
      enviar,
      `(() => {
        const a = document.querySelector("#trocar-foto").getBoundingClientRect();
        const b = document.querySelector("#remover").getBoundingClientRect();
        const y = a.top + a.height / 2;
        return [a.right - 1, b.left + 1].map((x) => document.elementFromPoint(x, y)?.id ?? "");
      })()`
    );
    expect(lados).toEqual(["trocar-foto", "remover"]);
  });
});
