import { niveis, numeroDaAula, progresso } from "./curso";
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
    const i = modulo.aulas.findIndex((a) => a.id === aulaId);
    const aula = modulo.aulas[i];
    if (aula) {
      return { aula, modulo, numeroNoModulo: numeroDaAula(i) };
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
  const { aula, modulo, numeroNoModulo } = localizar(item.curso, aulaId);
  return {
    aula: {
      duracaoSeg: aula.duracaoSeg,
      faltaSeg: Math.max(0, aula.duracaoSeg - posicaoSeg),
      id: aula.id,
      numeroNoModulo,
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

const ultimaAtividade = (
  c: CursoCatalogo,
  atividade: ReadonlyMap<AulaId, string>
) =>
  aulasDe(c).reduce((max, a) => {
    const quando = atividade.get(a.id) ?? "";
    return quando > max ? quando : max;
  }, "");

export interface AulaDeRetomada {
  aulaId: AulaId;
  posicaoSeg: number;
}

export function aulaDeRetomada(
  curso: CursoCatalogo,
  estado: Extract<EstadoCurso, { tipo: "em_andamento" | "nao_iniciado" }>,
  h: Historico,
  atividade: ReadonlyMap<AulaId, string>
): AulaDeRetomada {
  if (estado.tipo === "nao_iniciado") {
    return { aulaId: estado.primeiraAula, posicaoSeg: 0 };
  }
  let ultima: { aulaId: AulaId; quando: string } | null = null;
  for (const aula of aulasDe(curso)) {
    const quando = atividade.get(aula.id);
    if (quando && (!ultima || quando > ultima.quando)) {
      ultima = { aulaId: aula.id, quando };
    }
  }
  const aulaId =
    ultima && !h.assistidas.has(ultima.aulaId)
      ? ultima.aulaId
      : estado.proximaAula;
  return { aulaId, posicaoSeg: h.posicoes.get(aulaId)?.posicaoSeg ?? 0 };
}

export function retomada({
  atividade,
  cursos,
  historico: h,
}: EntradaRetomada): Retomada | null {
  const emAndamento = cursos
    .filter(ehEstado("em_andamento"))
    .reduce<ComEstado<"em_andamento"> | null>(
      (max, x) =>
        !max ||
        ultimaAtividade(x.curso, atividade) >
          ultimaAtividade(max.curso, atividade)
          ? x
          : max,
      null
    );
  if (emAndamento) {
    const { aulaId, posicaoSeg } = aulaDeRetomada(
      emAndamento.curso,
      emAndamento.estado,
      h,
      atividade
    );
    return continuar(emAndamento, aulaId, posicaoSeg, h);
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
    const { aula, modulo, numeroNoModulo } = localizar(
      novo.curso,
      novo.estado.primeiraAula
    );
    return {
      aula: {
        duracaoSeg: aula.duracaoSeg,
        id: aula.id,
        numeroNoModulo,
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
