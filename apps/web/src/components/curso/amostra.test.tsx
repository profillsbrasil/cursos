// A amostra nas três telas: o cartão de Meus cursos, a coluna de troca da página
// do curso e o fim do vídeo da aula de amostra. Texto, destino e o botão
// desligado com o saldo curto.

import { describe, expect, mock, test } from "bun:test";
import type { AulaNoPlayer } from "@cursos/api/dominio/aula";
import type { PaginaDoCurso } from "@cursos/api/dominio/pagina-do-curso";
import type { CursoVM } from "@cursos/api/dominio/painel";
import type { AulaId, CursoId } from "@cursos/api/dominio/tipos";
import { SEM_TRECHOS } from "@cursos/api/dominio/trechos";
import { renderToStaticMarkup } from "react-dom/server";

// Fora do App Router o useRouter lança; o resto do módulo fica o de verdade.
const navegacao = await import("next/navigation");
mock.module("next/navigation", () => ({
  ...navegacao,
  useRouter: () => ({
    push: () => undefined,
    refresh: () => undefined,
    replace: () => undefined,
  }),
}));

const { CapaCurso } = await import("@/components/meus-cursos/capa-curso");
const { FimDoVideo } = await import("@/components/player/fim-do-video");
const { TelaDoCurso } = await import("./tela-do-curso");
const { TrocaDaAmostra } = await import("./troca-da-amostra");
const { fabrica, HOJE, RISCOS } = await import("./exemplo-de-teste");

const CURSO = "00000000-0000-4000-8000-0000000000c1" as CursoId;
const AULA_1 = "00000000-0000-4000-8000-000000000001" as AulaId;
const AULA_2 = "00000000-0000-4000-8000-000000000002" as AulaId;
const CAPA = {
  alt: "Capa do curso Curso de Filmagem",
  altura: 720,
  largura: 1280,
  url: "/capa/filmagem.jpg",
};

const TAG = /<[^>]+>/g;
const texto = (html: string) =>
  html.replace(TAG, " ").replaceAll("&quot;", '"').replace(/\s+/g, " ").trim();
const BOTOES = /<button[^>]*>.*?<\/button>/g;
const LINKS = /<a [^>]*href="([^"]+)"/g;
const DESCRITO_POR = /aria-describedby="([^"]+)"/;
const SECAO_DO_CONTEUDO =
  /<section aria-labelledby="conteudo-do-curso">(.*?)<\/section>/;
const FECHADA = /Fechada\./g;
const TROQUE = /Troque para assistir/g;
const nada = () => undefined;

const botoes = (html: string) => html.match(BOTOES) ?? [];
const hrefs = (html: string) => [...html.matchAll(LINKS)].map((m) => m[1]);

/** O botão desligado e focável do Base UI: aria-disabled e data-disabled, sem disabled. */
function desligadoEFocavel(botao: string) {
  expect(botao).toContain('aria-disabled="true"');
  expect(botao).toContain("data-disabled");
  expect(botao).not.toContain(" disabled=");
}

/** A frase que o aria-describedby do botão aponta. */
function razaoDo(botao: string, html: string): string {
  const id = DESCRITO_POR.exec(botao)?.[1] ?? "";
  const alvo = new RegExp(`<p[^>]*id="${id}"[^>]*>(.*?)</p>`).exec(html);
  return texto(alvo?.[1] ?? "");
}

describe("o cartão da amostra em Meus cursos", () => {
  const curso: CursoVM = {
    amostra: { aulaId: AULA_1, preco: 2000, vista: false },
    aulas: 7,
    capa: CAPA,
    categoria: "Comercial",
    codigo: "COM-004",
    duracaoSeg: 960,
    estado: { primeiraAula: AULA_1, tipo: "nao_iniciado" },
    id: CURSO,
    moduloAtual: null,
    progresso: { feitas: 0, pct: 0, total: 7 },
    slug: "filmagem",
    temNiveis: false,
    titulo: "Curso de Filmagem",
  };

  test("mostra o selo, o preço e o tamanho, e leva à aula de amostra num link só", () => {
    const h = renderToStaticMarkup(<CapaCurso curso={curso} />);
    expect(texto(h)).toBe(
      "Amostra 2.000 pts Curso de Filmagem Comercial · COM-004 7 aulas · 16 min · a primeira é aberta Assistir à amostra"
    );
    expect(hrefs(h)).toEqual([`/cursos/filmagem/aulas/${AULA_1}`]);
  });

  test("com a amostra vista, diz Amostra vista; em produção, é o cartão de sempre", () => {
    const vista = renderToStaticMarkup(
      <CapaCurso
        curso={{
          ...curso,
          amostra: { aulaId: AULA_1, preco: 2000, vista: true },
        }}
      />
    );
    expect(texto(vista)).toContain("Amostra vista");
    const breve = renderToStaticMarkup(
      <CapaCurso curso={{ ...curso, estado: { tipo: "em_breve" } }} />
    );
    expect(texto(breve)).toContain("Em produção");
    expect(texto(breve)).not.toContain("Amostra");
  });
});

describe("a coluna de troca da página do curso", () => {
  const coluna = (preco: number | null, saldo: number) =>
    renderToStaticMarkup(
      <TrocaDaAmostra
        amostra={{
          aulaId: AULA_1,
          cursoId: CURSO,
          href: `/cursos/filmagem/aulas/${AULA_1}`,
          preco,
          saldo,
        }}
        pagina={
          { capa: CAPA, slug: "filmagem" } satisfies Pick<
            PaginaDoCurso,
            "capa" | "slug"
          >
        }
      />
    );

  test("com saldo, o preço grande, o saldo antes e depois e o Trocar", () => {
    const h = coluna(2000, 5010);
    expect(texto(h)).toBe(
      "Troque o curso inteiro por 2.000 pts Seu saldo: 5.010 pts. Depois da troca: 3.010 pts. Trocar por 2.000 pts Assistir à amostra"
    );
    const [trocar] = botoes(h);
    expect(trocar).toContain('aria-disabled="false"');
    expect(hrefs(h)).toEqual([`/cursos/filmagem/aulas/${AULA_1}`]);
  });

  test("sem saldo, o botão diz quanto falta, fica desligado e focável e aponta a razão", () => {
    const h = coluna(2000, 1810);
    const [faltam] = botoes(h);
    expect(texto(faltam ?? "")).toBe("Faltam 190 pts");
    desligadoEFocavel(faltam ?? "");
    expect(razaoDo(faltam ?? "", h)).toBe(
      "Seu saldo: 1.810 pts. Faltam 190 pts para trocar."
    );
  });

  test("o curso sem preço não tem troca, só a amostra", () => {
    const h = coluna(null, 5010);
    expect(texto(h)).toBe(
      "Este curso ainda não tem preço de troca. Assistir à amostra"
    );
    expect(botoes(h)).toEqual([]);
  });
});

describe("o fim do vídeo da aula de amostra", () => {
  const dados = (saldo: number): AulaNoPlayer => ({
    amostra: {
      cursoId: CURSO,
      preco: 2000,
      proxima: { id: AULA_2, titulo: "O momento certo de gravar" },
      saldo,
    },
    anterior: null,
    aula: {
      descricao: "",
      duracaoSeg: 60,
      id: AULA_1,
      modulo: { numero: 1, titulo: "Antes de filmar" },
      numeroNoModulo: 1,
      titulo: "Boas-vindas ao curso",
      totalNoModulo: 3,
      video: null,
    },
    curso: {
      progresso: { feitas: 1, pct: 14, total: 7 },
      slug: "filmagem",
      titulo: "Curso de Filmagem",
    },
    estudo: { assistida: true, posicaoSeg: 0, trechos: SEM_TRECHOS },
    modulos: [],
    proxima: null,
    questionario: null,
  });
  const fim = (saldo: number) =>
    renderToStaticMarkup(
      <FimDoVideo
        aoRever={nada}
        assistida
        conquista={null}
        dados={dados(saldo)}
      />
    );

  test("troca o A seguir pelo convite, com o Trocar e o Ver o curso", () => {
    const h = fim(5010);
    expect(texto(h)).toBe(
      'Gostou? A próxima aula é "O momento certo de gravar". Troque o curso por 2.000 pts e siga daqui. Seu saldo: 5.010 pts. Trocar por 2.000 pts Ver o curso'
    );
    expect(hrefs(h)).toEqual(["/cursos/filmagem"]);
    expect(texto(h)).not.toContain("Próxima aula");
  });

  test("sem saldo, o Trocar vira o quanto falta, desligado e focável", () => {
    const h = fim(1810);
    const [faltam] = botoes(h);
    expect(texto(faltam ?? "")).toBe("Faltam 190 pts");
    desligadoEFocavel(faltam ?? "");
    expect(razaoDo(faltam ?? "", h)).toContain("Seu saldo: 1.810 pts.");
  });
});

describe("a página do curso na amostra", () => {
  const pagina: PaginaDoCurso = {
    ...fabrica.naoIniciado,
    amostra: {
      aulaId: RISCOS,
      cursoId: CURSO,
      href: `/cursos/fabrica-e-montagem/aulas/${RISCOS}`,
      preco: 2000,
      saldo: 5010,
    },
  };
  const h = renderToStaticMarkup(<TelaDoCurso hoje={HOJE} pagina={pagina} />);

  test("a coluna troca o curso no lugar de Seu progresso", () => {
    expect(h).toContain('aria-label="Trocar o curso"');
    expect(h).not.toContain('aria-label="Seu progresso"');
  });

  test("só a aula de amostra é link, com a etiqueta; as outras têm o cadeado e Troque para assistir", () => {
    const conteudo = SECAO_DO_CONTEUDO.exec(h)?.[1] ?? "";
    expect(hrefs(conteudo)).toEqual([
      `/cursos/fabrica-e-montagem/aulas/${RISCOS}`,
    ]);
    expect(texto(conteudo)).toContain("Amostra");
    expect(conteudo.match(FECHADA)).toHaveLength(3);
    expect(conteudo.match(TROQUE)).toHaveLength(3);
  });
});
