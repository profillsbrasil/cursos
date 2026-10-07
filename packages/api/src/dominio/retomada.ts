import { niveis, progresso } from "./curso";
import type { Retomada } from "./painel";
import type { AulaId, CursoCatalogo, EstadoCurso, Historico } from "./tipos";

export interface CursoNaTela {
  curso: CursoCatalogo;
  estado: EstadoCurso;
  trilha: { titulo: string } | null;
}

export interface EntradaRetomada {
  /** Momento ISO da última atividade por aula: assistida ou posição salva. */
  atividade: ReadonlyMap<AulaId, string>;
  /** Cursos acessíveis na ordem da tela: trilhas, depois soltos. */
  cursos: readonly CursoNaTela[];
  historico: Historico;
}

const aulasDe = (c: CursoCatalogo) => c.modulos.flatMap((m) => m.aulas);

const cursoRef = (c: CursoCatalogo) => ({
  capa: c.capa,
  slug: c.slug,
  titulo: c.titulo,
});

function localizar(curso: CursoCatalogo, aulaId: AulaId) {
  for (const modulo of curso.modulos) {
    const aula = modulo.aulas.find((a) => a.id === aulaId);
    if (aula) {
      return { aula, modulo };
    }
  }
  throw new Error(`Aula ${aulaId} fora do curso ${curso.slug}`);
}

function continuar(
  item: CursoNaTela,
  aulaId: AulaId,
  posicaoSeg: number,
  h: Historico
): Retomada {
  const { aula, modulo } = localizar(item.curso, aulaId);
  return {
    aula: {
      duracaoSeg: aula.duracaoSeg,
      faltaSeg: Math.max(0, aula.duracaoSeg - posicaoSeg),
      id: aula.id,
      numeroNoModulo: aula.posicao,
      posicaoSeg,
      titulo: aula.titulo,
    },
    curso: cursoRef(item.curso),
    modulo: { numero: modulo.numero, titulo: modulo.titulo },
    progresso: progresso(item.curso, h.assistidas),
    proximoNivel: niveis(item.curso, h.assistidas).proximo?.nome ?? null,
    tipo: "continuar",
    trilha: item.trilha,
  };
}

type ComEstado<T extends EstadoCurso["tipo"]> = CursoNaTela & {
  estado: Extract<EstadoCurso, { tipo: T }>;
};

const ehEstado =
  <T extends EstadoCurso["tipo"]>(tipo: T) =>
  (x: CursoNaTela): x is ComEstado<T> =>
    x.estado.tipo === tipo;

/** Posição mais recente entre as aulas dos cursos dados. */
function ultimaPosicao(
  cursos: readonly ComEstado<"em_andamento">[],
  h: Historico
) {
  let melhor: {
    aulaId: AulaId;
    item: ComEstado<"em_andamento">;
    posicaoSeg: number;
    quando: string;
  } | null = null;
  for (const item of cursos) {
    for (const aula of aulasDe(item.curso)) {
      const p = h.posicoes.get(aula.id);
      if (p && (!melhor || p.atualizadaEm > melhor.quando)) {
        melhor = {
          aulaId: aula.id,
          item,
          posicaoSeg: p.posicaoSeg,
          quando: p.atualizadaEm,
        };
      }
    }
  }
  return melhor;
}

const ultimaAtividade = (
  c: CursoCatalogo,
  atividade: ReadonlyMap<AulaId, string>
) =>
  aulasDe(c).reduce((max, a) => {
    const quando = atividade.get(a.id) ?? "";
    return quando > max ? quando : max;
  }, "");

export function retomada({
  atividade,
  cursos,
  historico: h,
}: EntradaRetomada): Retomada | null {
  const emAndamento = cursos.filter(ehEstado("em_andamento"));
  // 1 a 3: a última aula aberta, se ainda não foi assistida; senão a próxima do mesmo curso.
  const ultima = ultimaPosicao(emAndamento, h);
  if (ultima) {
    return h.assistidas.has(ultima.aulaId)
      ? continuar(ultima.item, ultima.item.estado.proximaAula, 0, h)
      : continuar(ultima.item, ultima.aulaId, ultima.posicaoSeg, h);
  }
  // 4: sem posição válida, o primeiro curso em andamento na ordem da tela.
  const [primeiro] = emAndamento;
  if (primeiro) {
    return continuar(primeiro, primeiro.estado.proximaAula, 0, h);
  }
  // 5: o curso em prova com a atividade mais recente.
  const emProva = cursos
    .filter(ehEstado("prova"))
    .reduce<CursoNaTela | null>(
      (max, x) =>
        !max ||
        ultimaAtividade(x.curso, atividade) >
          ultimaAtividade(max.curso, atividade)
          ? x
          : max,
      null
    );
  if (emProva) {
    return {
      curso: cursoRef(emProva.curso),
      progresso: progresso(emProva.curso, h.assistidas),
      tipo: "prova",
      trilha: emProva.trilha,
    };
  }
  // 6: o primeiro curso não iniciado, trilhas antes dos soltos.
  const novo = cursos.find(ehEstado("nao_iniciado"));
  if (novo) {
    const { aula, modulo } = localizar(novo.curso, novo.estado.primeiraAula);
    return {
      aula: {
        duracaoSeg: aula.duracaoSeg,
        id: aula.id,
        numeroNoModulo: aula.posicao,
        titulo: aula.titulo,
      },
      curso: cursoRef(novo.curso),
      modulo: { numero: modulo.numero, titulo: modulo.titulo },
      tipo: "comecar",
      trilha: novo.trilha,
    };
  }
  return null;
}
