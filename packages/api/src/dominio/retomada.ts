import { niveis } from "./curso";
import type { AulaDaVez, CursoDoAluno } from "./curso-do-aluno";
import type { Estudo } from "./historico";
import type { Retomada } from "./painel";
import type {
  AulaCatalogo,
  AulaId,
  CursoCatalogo,
  Historico,
  TipoEstado,
} from "./tipos";

/** Um curso liberado e a leitura dele, na ordem da tela. */
export interface CursoNaTela {
  curso: CursoCatalogo;
  leitura: CursoDoAluno;
}

export interface EntradaRetomada {
  /** Cursos acessíveis na ordem da tela. */
  cursos: readonly CursoNaTela[];
  estudo: Estudo;
}

const aulasDe = (c: CursoCatalogo) => c.modulos.flatMap((m) => m.aulas);

const cursoRef = (c: CursoCatalogo) => ({
  capa: c.capa,
  slug: c.slug,
  titulo: c.titulo,
});

const ehEstado = (tipo: TipoEstado) => (x: CursoNaTela) =>
  x.leitura.estado.tipo === tipo;

const ultimaAtividade = (
  c: CursoCatalogo,
  atividade: ReadonlyMap<AulaId, string>
) =>
  aulasDe(c).reduce((max, a) => {
    const quando = atividade.get(a.id) ?? "";
    return quando > max ? quando : max;
  }, "");

/** O curso começado em que a pessoa estudou por último. */
function maisRecente(
  cursos: readonly CursoNaTela[],
  atividade: ReadonlyMap<AulaId, string>
): CursoNaTela | null {
  return cursos.reduce<CursoNaTela | null>(
    (max, x) =>
      !max ||
      ultimaAtividade(x.curso, atividade) >
        ultimaAtividade(max.curso, atividade)
        ? x
        : max,
    null
  );
}

/** A aula da vez, com o que o banner mostra dela; o curso que abre aula sempre tem uma. */
function aulaDaVez(x: CursoNaTela): { aula: AulaCatalogo; vez: AulaDaVez } {
  const vez = x.leitura.aulaDaVez;
  const aula = vez && aulasDe(x.curso).find((a) => a.id === vez.id);
  if (!(vez && aula)) {
    throw new Error(`Curso ${x.curso.slug} sem aula da vez`);
  }
  return { aula, vez };
}

const aulaRef = (aula: AulaCatalogo, vez: AulaDaVez) => ({
  duracaoSeg: aula.duracaoSeg,
  id: aula.id,
  numeroNoModulo: vez.onde.aula,
  titulo: aula.titulo,
});

function continuar(x: CursoNaTela, h: Historico): Retomada {
  const { aula, vez } = aulaDaVez(x);
  return {
    aula: {
      ...aulaRef(aula, vez),
      faltaSeg: Math.max(0, aula.duracaoSeg - vez.posicaoSeg),
      posicaoSeg: vez.posicaoSeg,
    },
    curso: cursoRef(x.curso),
    modulo: vez.onde.modulo,
    progresso: x.leitura.progresso,
    proximoNivel: niveis(x.curso, h.assistidas).proximo?.nome ?? null,
    tipo: "continuar",
  };
}

export function retomada({
  cursos,
  estudo: { atividade, historico: h },
}: EntradaRetomada): Retomada | null {
  const emAndamento = maisRecente(
    cursos.filter(ehEstado("em_andamento")),
    atividade
  );
  if (emAndamento) {
    return continuar(emAndamento, h);
  }
  // 5: o curso com questionário pendente e a atividade mais recente.
  const comQuestionario = maisRecente(
    cursos.filter(ehEstado("questionarios")),
    atividade
  );
  if (comQuestionario) {
    const { aula, vez } = aulaDaVez(comQuestionario);
    return {
      aula: aulaRef(aula, vez),
      curso: cursoRef(comQuestionario.curso),
      modulo: vez.onde.modulo,
      questionarios: comQuestionario.leitura.questionarios,
      tipo: "questionario",
      ultima: h.questionarios.get(aula.id)?.ultima ?? null,
    };
  }
  // 6: o primeiro curso não iniciado, na ordem da tela.
  const novo = cursos.find(ehEstado("nao_iniciado"));
  if (novo) {
    const { aula, vez } = aulaDaVez(novo);
    return {
      aula: aulaRef(aula, vez),
      curso: cursoRef(novo.curso),
      modulo: vez.onde.modulo,
      tipo: "comecar",
    };
  }
  return null;
}
