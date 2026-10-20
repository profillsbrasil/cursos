import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import {
  exemploDoPrototipo,
  HOJE_DO_EXEMPLO,
} from "@cursos/api/dominio/exemplo";
import { montarPainel, type ResumoAluno } from "@cursos/api/dominio/painel";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import CarregandoMeusCursos from "@/app/(aluno)/meus-cursos/loading";
import { ConteudoMeusCursos } from "@/components/meus-cursos/conteudo";

import {
  abrirChromium,
  avaliar,
  CHROMIUM,
  cssDoApp,
  type Enviar,
  fecharChromium,
} from "../chromium-de-teste";
import { CabecalhoDaPagina } from "../casca/cabecalho-da-pagina";

const naPagina = (filhos: ReactNode) =>
  renderToStaticMarkup(
    <main className="px-4 pt-8 text-sm">
      {filhos}
      <div id="depois">conteúdo</div>
    </main>
  );

const RESUMO: ResumoAluno = {
  bonus: 30,
  dias: [],
  faltamParaBonus: 5,
  pontosSemana: 0,
  saldo: 0,
  sequenciaDias: 0,
};

const PAGINAS = {
  cabecalhoComResumo: naPagina(
    <CabecalhoDaPagina
      resumo="3 cursos liberados para você"
      titulo="Meus cursos"
    />
  ),
  cabecalhoNoEsqueleto: naPagina(
    <CabecalhoDaPagina resumo={null} titulo="Meus cursos" />
  ),
  esqueletoDeMeusCursos: naPagina(<CarregandoMeusCursos />),
  meusCursos: naPagina(
    <ConteudoMeusCursos
      painel={montarPainel(exemploDoPrototipo(), HOJE_DO_EXEMPLO)}
      resumo={RESUMO}
      temCursoTrocavelNaVitrine={false}
    />
  ),
};

const CLASSES = /class="([^"]*)"/g;
const ESPACO = /\s+/;
const css = await cssDoApp(
  Object.values(PAGINAS).flatMap((html) =>
    [...html.matchAll(CLASSES)].flatMap(([, c = ""]) => c.split(ESPACO))
  )
);

let enviar: Enviar;

async function topoDoConteudo(largura: number, corpo: string) {
  await enviar("Emulation.setDeviceMetricsOverride", {
    deviceScaleFactor: 1,
    height: 900,
    mobile: false,
    width: largura,
  });
  return await avaliar<number>(
    enviar,
    `document.open(); document.write(${JSON.stringify(
      `<!doctype html><html class="dark" lang="pt-BR"><head><style>${css}</style></head><body style="margin:0">${corpo}</body></html>`
    )}); document.close(); Math.round(document.querySelector("header").nextElementSibling.getBoundingClientRect().top)`
  );
}

describe.skipIf(!existsSync(CHROMIUM))(
  "o esqueleto guarda o lugar do resumo do cabeçalho",
  () => {
    beforeAll(async () => {
      enviar = await abrirChromium("cabecalho-da-pagina");
    }, 20_000);

    afterAll(fecharChromium);

    for (const largura of [1440, 390]) {
      test(`${largura} px: o conteúdo começa na mesma altura com o resumo e com a linha que pulsa`, async () => {
        expect(
          await topoDoConteudo(largura, PAGINAS.cabecalhoNoEsqueleto)
        ).toBe(await topoDoConteudo(largura, PAGINAS.cabecalhoComResumo));
      });

      test(`${largura} px: o banner de Meus cursos não desce quando a página chega`, async () => {
        expect(
          await topoDoConteudo(largura, PAGINAS.esqueletoDeMeusCursos)
        ).toBe(await topoDoConteudo(largura, PAGINAS.meusCursos));
      });
    }
  }
);
