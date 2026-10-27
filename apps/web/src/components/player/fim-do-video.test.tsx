import { describe, expect, test } from "bun:test";
import type { AulaNoPlayer } from "@cursos/api/dominio/aula";
import type { AulaId } from "@cursos/api/dominio/tipos";
import { SEM_TRECHOS } from "@cursos/api/dominio/trechos";
import { renderToStaticMarkup } from "react-dom/server";

import { FimDoVideo } from "./fim-do-video";

const ATUAL = "00000000-0000-4000-8000-000000000004" as AulaId;
const PROXIMA = "00000000-0000-4000-8000-000000000005" as AulaId;

const DADOS: AulaNoPlayer = {
  amostra: null,
  anterior: null,
  aula: {
    descricao: "",
    duracaoSeg: 634,
    id: ATUAL,
    modulo: { numero: 8, titulo: "Pilar Urgência" },
    numeroNoModulo: 4,
    titulo: "Cronograma reverso",
    totalNoModulo: 8,
    video: null,
  },
  curso: {
    progresso: { feitas: 46, pct: 51, total: 90 },
    slug: "comercial",
    titulo: "Profills School Comercial",
  },
  estudo: { assistida: false, posicaoSeg: 0, trechos: SEM_TRECHOS },
  modulos: [
    {
      atual: true,
      aulas: [
        {
          assistida: false,
          atual: true,
          duracaoSeg: 634,
          id: ATUAL,
          questionario: { tipo: "sem" },
          titulo: "Cronograma reverso",
        },
        {
          assistida: false,
          atual: false,
          duracaoSeg: 420,
          id: PROXIMA,
          questionario: { tipo: "sem" },
          titulo: "Prazo que o cliente aceita",
        },
      ],
      feitas: 0,
      numero: 8,
      titulo: "Pilar Urgência",
    },
  ],
  proxima: { id: PROXIMA, titulo: "Prazo que o cliente aceita" },
  questionario: null,
};

const nada = () => undefined;

const html = (props: Partial<Parameters<typeof FimDoVideo>[0]> = {}): string =>
  renderToStaticMarkup(
    <FimDoVideo
      aoRever={nada}
      assistida
      conquista={null}
      dados={DADOS}
      {...props}
    />
  );

describe("o cartão de fim do vídeo", () => {
  test("com a aula assistida e próxima aula, diz o que vem e leva até ela", () => {
    const h = html();
    expect(h).toContain("Aula assistida");
    expect(h).toContain("A seguir: Prazo que o cliente aceita · 7 min");
    expect(h).toContain(`href="/cursos/comercial/aulas/${PROXIMA}"`);
    expect(h).toContain("Próxima aula");
    expect(h).toContain("Rever do início");
  });

  test("sem a aula assistida, o título é Fim do vídeo", () => {
    const h = html({ assistida: false });
    expect(h).toContain("Fim do vídeo");
    expect(h).not.toContain("Aula assistida");
  });

  test("os pontos aparecem só quando houve conquista nesta sessão", () => {
    expect(html()).not.toContain("pts");
    expect(
      html({
        conquista: { bonusSequencia: null, pontos: 10, sequenciaDias: 1 },
      })
    ).toContain("+10 pts");
  });

  test("na última aula, Ver o curso no lugar da próxima, sem o A seguir", () => {
    const h = html({ dados: { ...DADOS, proxima: null } });
    expect(h).toContain("Ver o curso");
    expect(h).toContain('href="/cursos/comercial"');
    expect(h).not.toContain("A seguir");
    expect(h).not.toContain("Próxima aula");
  });
});
