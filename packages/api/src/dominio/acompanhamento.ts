// O que o admin vê do estudo de cada pessoa: o acompanhamento de cada liberação,
// na tela de acesso, e a situação da pessoa, na busca. O alcance, o estado, o
// progresso e a aula do Continuar saem das regras de Meus cursos (alcance,
// estadoDoCurso, progresso, atividadeDe, ondeNoCurso): nada aqui decide de novo
// se um curso abre, se foi começado ou se foi concluído.

import {
  alcance,
  type CursoComAulas,
  estadoDoCurso,
  type Progresso,
  progresso,
} from "./curso";
import {
  atividadeDe,
  historicoDe,
  type LinhasHistorico,
  posicaoComecada,
} from "./historico";
import { ondeNoCurso } from "./retomada";
import { diaLocal } from "./sequencia";
import type {
  AulaId,
  CursoCatalogo,
  CursoId,
  DiaISO,
  EstadoCurso,
  Historico,
  Pessoa,
  ResultadoDaBusca,
  StatusDoCurso,
} from "./tipos";

// ---------- o que a tela recebe ----------

/** Onde a pessoa está no curso: a aula para onde o Continuar dela leva. */
export interface Onde {
  aula: number;
  modulo: number;
}

/**
 * O estado do curso como o admin lê. "Nunca abriu" é o "Não iniciado" do aluno,
 * e "Em produção" é o "Em breve". Quem parou de estudar não ganha estado
 * próprio: a tela mostra o dia do último estudo.
 */
export type SituacaoNoCurso =
  | { tipo: "em_producao" }
  | { tipo: "nunca_abriu" }
  | { tipo: "estudando"; onde: Onde; ultimoEstudo: DiaISO }
  | { tipo: "falta_prova"; ultimoEstudo: DiaISO }
  | { tipo: "concluido"; em: DiaISO };

/** O estudo da pessoa no curso de uma liberação. */
export interface Acompanhamento {
  progresso: Progresso;
  situacao: SituacaoNoCurso;
  titulo: string;
}

export interface NumerosDaPessoa {
  concluidos: number;
  /** Cursos que a pessoa alcança e que não estão em produção; os concluídos entram. */
  cursos: number;
  /** Liberações ativas. */
  liberacoes: number;
}

/**
 * A situação da pessoa, como a busca a mostra. A ordem dos tipos é a ordem da
 * decisão. "Resumo" é do placar do aluno (`aluno.resumo`), não daqui.
 */
export type SituacaoDaPessoa =
  | {
      tipo: "sem_liberacao";
      revogadas: number;
      ultimaRevogacao: DiaISO | null;
    }
  | { tipo: "nunca_abriu"; desde: DiaISO; numeros: NumerosDaPessoa }
  | { tipo: "concluiu_tudo"; numeros: NumerosDaPessoa; ultimoEstudo: DiaISO }
  | { tipo: "estudando"; numeros: NumerosDaPessoa; ultimoEstudo: DiaISO };

export interface PessoaComSituacao extends Pessoa {
  situacao: SituacaoDaPessoa;
}

export interface BuscaDeAlunos {
  /** O dia de São Paulo em que o servidor montou a resposta, para a tela dizer "ontem". */
  hoje: DiaISO;
  pessoas: readonly PessoaComSituacao[];
  total: number;
}

// ---------- o estudo da pessoa ----------

/** O histórico da pessoa e o último momento de estudo de cada aula. */
export interface Estudo {
  atividade: ReadonlyMap<AulaId, string>;
  historico: Historico;
}

/** Posição em 0 s não é estudo: a atividade conta só as posições começadas, como o histórico. */
export function estudoDe(l: LinhasHistorico): Estudo {
  return {
    atividade: atividadeDe({
      ...l,
      posicoes: l.posicoes.filter(posicaoComecada),
    }),
    historico: historicoDe(l),
  };
}

const diaDe = (iso: string): DiaISO => diaLocal(new Date(iso));

const maisRecente = (dias: readonly (DiaISO | null)[]): DiaISO | null =>
  dias.reduce<DiaISO | null>(
    (max, dia) => (dia !== null && (max === null || dia > max) ? dia : max),
    null
  );

/**
 * Último estudo no curso: o dia mais recente, em São Paulo, de aula assistida,
 * de posição acima de 0 s ou do certificado. null: a pessoa nunca estudou o curso.
 */
export function ultimoEstudo(curso: CursoComAulas, e: Estudo): DiaISO | null {
  let ultimo = e.historico.certificados.get(curso.id)?.emitidoEm ?? "";
  for (const modulo of curso.modulos) {
    for (const aula of modulo.aulas) {
      const quando = e.atividade.get(aula.id) ?? "";
      if (quando > ultimo) {
        ultimo = quando;
      }
    }
  }
  return ultimo ? diaDe(ultimo) : null;
}

/** Curso em andamento ou na prova sempre tem estudo: estadoDoCurso só chega lá com aula tocada. */
function estudou(curso: CursoComAulas, e: Estudo): DiaISO {
  const dia = ultimoEstudo(curso, e);
  if (!dia) {
    throw new Error(`Curso ${curso.titulo} começado sem estudo registrado.`);
  }
  return dia;
}

export function situacaoNoCurso(
  curso: CursoCatalogo,
  estado: EstadoCurso,
  e: Estudo
): SituacaoNoCurso {
  switch (estado.tipo) {
    case "em_breve":
      return { tipo: "em_producao" };
    case "nao_iniciado":
      return { tipo: "nunca_abriu" };
    case "em_andamento": {
      const onde = ondeNoCurso(curso, estado, e.historico, e.atividade);
      if (!onde) {
        throw new Error(`Curso ${curso.titulo} em andamento sem aula.`);
      }
      return {
        onde: { aula: onde.aula, modulo: onde.modulo.numero },
        tipo: "estudando",
        ultimoEstudo: estudou(curso, e),
      };
    }
    case "prova":
      return { tipo: "falta_prova", ultimoEstudo: estudou(curso, e) };
    case "concluido":
      return { em: diaDe(estado.certificado.emitidoEm), tipo: "concluido" };
    default:
      return estado satisfies never;
  }
}

// ---------- o acompanhamento de uma liberação ----------

/** O curso pelo mesmo estadoDoCurso de Meus cursos. */
export function acompanharCurso(
  curso: CursoCatalogo,
  e: Estudo
): Acompanhamento {
  return {
    progresso: progresso(curso, e.historico.assistidas),
    situacao: situacaoNoCurso(curso, estadoDoCurso(curso, e.historico), e),
    titulo: curso.titulo,
  };
}

// ---------- a situação da pessoa na busca ----------

/** Um curso como o statement da busca lê: só o que estado e progresso pedem. */
export interface CursoDaBusca {
  id: string;
  /** Em ordem de número, aulas em ordem de posição. */
  modulos: readonly { aulas: readonly { id: string }[] }[];
  status: StatusDoCurso;
  titulo: string;
}

export interface LiberacaoDaBusca {
  cursoId: string;
  liberadaEm: Date;
  revogadaEm: Date | null;
}

export interface LinhasDaPessoa extends LinhasHistorico {
  /** Todas as liberações, revogadas inclusive. */
  liberacoes: readonly LiberacaoDaBusca[];
  userId: string;
}

/** O statement da busca: uma linha por pessoa e os cursos que elas alcançam. */
export interface LinhasDaBusca {
  /** Os cursos que alguma das pessoas alcança por liberação ativa. */
  cursos: readonly CursoDaBusca[];
  pessoas: readonly LinhasDaPessoa[];
}

type CatalogoDaBusca = (id: string) => CursoComAulas;

function catalogoDo(linhas: LinhasDaBusca): CatalogoDaBusca {
  const cursos = new Map(
    linhas.cursos.map((c) => [
      c.id,
      {
        id: c.id as CursoId,
        modulos: c.modulos.map((m) => ({
          aulas: m.aulas.map((a) => ({ id: a.id as AulaId })),
        })),
        status: c.status,
        titulo: c.titulo,
      },
    ])
  );
  return (id) => {
    const c = cursos.get(id);
    if (!c) {
      throw new Error(`Curso ${id} alcançado e fora do catálogo da busca.`);
    }
    return c;
  };
}

const maisAntiga = (datas: readonly Date[]) =>
  datas.reduce((min, d) => (d < min ? d : min));

export function situacaoDaPessoa(
  p: LinhasDaPessoa,
  curso: CatalogoDaBusca
): SituacaoDaPessoa {
  const ativas = p.liberacoes.filter((l) => l.revogadaEm === null);
  if (ativas.length === 0) {
    const revogacoes = p.liberacoes.flatMap((l) =>
      l.revogadaEm ? [diaLocal(l.revogadaEm)] : []
    );
    return {
      revogadas: revogacoes.length,
      tipo: "sem_liberacao",
      ultimaRevogacao: maisRecente(revogacoes),
    };
  }
  const e = estudoDe(p);
  const alcancados = alcance(
    ativas.map((l) => curso(l.cursoId)),
    e.historico
  );
  const contaveis = alcancados.filter((x) => x.estado.tipo !== "em_breve");
  const numeros: NumerosDaPessoa = {
    concluidos: contaveis.filter((x) => x.estado.tipo === "concluido").length,
    cursos: contaveis.length,
    liberacoes: ativas.length,
  };
  const ultimo = maisRecente(alcancados.map((x) => ultimoEstudo(x.curso, e)));
  if (!ultimo) {
    return {
      desde: diaLocal(maisAntiga(ativas.map((l) => l.liberadaEm))),
      numeros,
      tipo: "nunca_abriu",
    };
  }
  if (numeros.cursos > 0 && numeros.concluidos === numeros.cursos) {
    return { numeros, tipo: "concluiu_tudo", ultimoEstudo: ultimo };
  }
  return { numeros, tipo: "estudando", ultimoEstudo: ultimo };
}

/** A página do Clerk com a situação de cada pessoa, na ordem do Clerk. */
export function montarBusca(
  resultado: ResultadoDaBusca,
  linhas: LinhasDaBusca,
  hoje: DiaISO
): BuscaDeAlunos {
  const curso = catalogoDo(linhas);
  const porPessoa = new Map(linhas.pessoas.map((p) => [p.userId, p]));
  return {
    hoje,
    pessoas: resultado.pessoas.map((pessoa) => {
      const p = porPessoa.get(pessoa.userId);
      if (!p) {
        throw new Error(`O statement da busca não trouxe ${pessoa.userId}.`);
      }
      return { ...pessoa, situacao: situacaoDaPessoa(p, curso) };
    }),
    total: resultado.total,
  };
}
