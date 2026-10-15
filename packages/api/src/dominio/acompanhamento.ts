// O que o admin vê do estudo de cada pessoa: o acompanhamento de cada liberação,
// na tela de acesso, e a situação da pessoa, na busca. O alcance, o estado, o
// progresso, o curso da vez e a aula do Continuar saem das regras de Meus cursos
// (alcance, estadoDoCurso, trilhaVM, progresso, atividadeDe, ondeNoCurso): nada
// aqui decide de novo se um curso abre, se foi começado ou se foi concluído.

import {
  alcance,
  type CursoComAulas,
  type Progresso,
  progresso,
} from "./curso";
import {
  atividadeDe,
  historicoDe,
  type LinhasHistorico,
  posicaoComecada,
} from "./historico";
import { type TrilhaVM, trilhaVM } from "./painel";
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
  TrilhaCatalogo,
  TrilhaId,
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
  | { tipo: "bloqueado"; depoisDe: { posicao: number; titulo: string } }
  | { tipo: "nunca_abriu" }
  | { tipo: "estudando"; onde: Onde; ultimoEstudo: DiaISO }
  | { tipo: "falta_prova"; ultimoEstudo: DiaISO }
  | { tipo: "concluido"; em: DiaISO };

export interface CursoAcompanhado {
  progresso: Progresso;
  situacao: SituacaoNoCurso;
  titulo: string;
}

/** A trilha inteira na palavra do admin: o que o selo do item da trilha diz. */
export type SituacaoNaTrilha =
  | "nunca_abriu"
  | "estudando"
  | "falta_prova"
  | "concluida"
  | "aguardando_producao";

/** O estudo da pessoa no alvo de uma liberação. */
export type Acompanhamento =
  | { tipo: "curso"; curso: CursoAcompanhado }
  | {
      tipo: "trilha";
      /** Aulas dos cursos que não estão em produção, como em Meus cursos. */
      aulas: Progresso;
      concluidos: number;
      /** Em ordem de posição. */
      cursos: readonly (CursoAcompanhado & { posicao: number })[];
      /** Posição do curso da vez; null quando nenhum curso abre sem estar concluído. */
      daVez: number | null;
      situacao: SituacaoNaTrilha;
      ultimoEstudo: DiaISO | null;
    };

export interface NumerosDaPessoa {
  concluidos: number;
  /** Cursos que a pessoa alcança e que não estão em produção; os concluídos entram. */
  cursos: number;
  /** Liberações ativas. */
  liberacoes: number;
}

/** O que a busca mostra de cada pessoa. A ordem dos tipos é a ordem da decisão. */
export type ResumoDaPessoa =
  | {
      tipo: "sem_liberacao";
      revogadas: number;
      ultimaRevogacao: DiaISO | null;
    }
  | { tipo: "nunca_abriu"; desde: DiaISO; numeros: NumerosDaPessoa }
  | { tipo: "concluiu_tudo"; numeros: NumerosDaPessoa; ultimoEstudo: DiaISO }
  | { tipo: "estudando"; numeros: NumerosDaPessoa; ultimoEstudo: DiaISO };

export interface PessoaComResumo extends Pessoa {
  resumo: ResumoDaPessoa;
}

export interface BuscaDeAlunos {
  /** O dia de São Paulo em que o servidor montou a resposta, para a tela dizer "ontem". */
  hoje: DiaISO;
  pessoas: readonly PessoaComResumo[];
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

/** `ordem`: os cursos da trilha, para dizer depois de qual o bloqueado abre. */
export function situacaoNoCurso(
  curso: CursoCatalogo,
  estado: EstadoCurso,
  e: Estudo,
  ordem: readonly CursoId[]
): SituacaoNoCurso {
  switch (estado.tipo) {
    case "em_breve":
      return { tipo: "em_producao" };
    case "bloqueado":
      return {
        depoisDe: {
          posicao: ordem.indexOf(estado.liberadoPor.id) + 1,
          titulo: estado.liberadoPor.titulo,
        },
        tipo: "bloqueado",
      };
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

/** Curso liberado direto: sem antecessor, como os soltos de Meus cursos. */
export function acompanharCurso(
  curso: CursoCatalogo,
  e: Estudo
): Acompanhamento {
  const [solto] = alcance([], [curso], e.historico).soltos;
  const estado = solto?.estado ?? { tipo: "em_breve" };
  return {
    curso: {
      progresso: progresso(curso, e.historico.assistidas),
      situacao: situacaoNoCurso(curso, estado, e, []),
      titulo: curso.titulo,
    },
    tipo: "curso",
  };
}

/**
 * A trilha pelo `alcance` e pela `trilhaVM` de Meus cursos. `diretos`: os cursos
 * com liberação direta ativa, que não esperam o anterior.
 */
export function acompanharTrilha(
  trilha: TrilhaCatalogo,
  e: Estudo,
  diretos: readonly CursoCatalogo[]
): Acompanhamento {
  const [alcancada] = alcance([trilha], diretos, e.historico).trilhas;
  if (!alcancada) {
    throw new Error(`Trilha ${trilha.titulo} fora do próprio alcance.`);
  }
  const { vm } = trilhaVM(alcancada, e.historico, e.atividade);
  const ordem = trilha.cursos.map((c) => c.id);
  const doCatalogo = new Map(trilha.cursos.map((c) => [c.id, c]));
  const cursos = vm.cursos.map((c) => {
    const curso = doCatalogo.get(c.id);
    if (!curso) {
      throw new Error(`Curso ${c.id} fora da trilha ${trilha.titulo}.`);
    }
    return {
      posicao: c.posicao,
      progresso: c.progresso,
      situacao: situacaoNoCurso(curso, c.estado, e, ordem),
      titulo: c.titulo,
    };
  });
  const daVez = vm.daVez?.posicao ?? null;
  const ultimo = maisRecente(trilha.cursos.map((c) => ultimoEstudo(c, e)));
  return {
    aulas: vm.aulas,
    concluidos: vm.concluidos,
    cursos,
    daVez,
    situacao: situacaoNaTrilha(
      vm.situacao,
      cursos.find((c) => c.posicao === daVez),
      ultimo
    ),
    tipo: "trilha",
    ultimoEstudo: ultimo,
  };
}

/**
 * "Nunca abriu" é a mesma regra da situação da pessoa: nenhum estudo em curso
 * nenhum da trilha. Com estudo, a trilha em curso espera a prova quando o curso
 * da vez espera, e está "Estudando" no resto, inclusive quando o curso da vez
 * ainda não foi aberto depois de um curso concluído.
 */
function situacaoNaTrilha(
  situacao: TrilhaVM["situacao"],
  daVez: CursoAcompanhado | undefined,
  ultimo: DiaISO | null
): SituacaoNaTrilha {
  if (situacao !== "em_curso") {
    return situacao;
  }
  if (ultimo === null) {
    return "nunca_abriu";
  }
  return daVez?.situacao.tipo === "falta_prova" ? "falta_prova" : "estudando";
}

// ---------- o resumo da pessoa na busca ----------

/** Um curso como o statement da busca lê: só o que estado e progresso pedem. */
export interface CursoDoResumo {
  id: string;
  /** Em ordem de número, aulas em ordem de posição. */
  modulos: readonly { aulas: readonly { id: string }[] }[];
  status: StatusDoCurso;
  titulo: string;
}

export interface LiberacaoDoResumo {
  cursoId: string | null;
  liberadaEm: Date;
  revogadaEm: Date | null;
  trilhaId: string | null;
}

export interface LinhasDaPessoa extends LinhasHistorico {
  /** Todas as liberações, revogadas inclusive. */
  liberacoes: readonly LiberacaoDoResumo[];
  userId: string;
}

/** O statement da busca: uma linha por pessoa e o catálogo que elas alcançam. */
export interface LinhasDoResumo {
  /** Os cursos que alguma das pessoas alcança por liberação ativa. */
  cursos: readonly CursoDoResumo[];
  pessoas: readonly LinhasDaPessoa[];
  /** As trilhas com liberação ativa de alguma das pessoas, com os cursos em ordem de posição. */
  trilhas: readonly { cursos: readonly string[]; id: string }[];
}

interface CatalogoDoResumo {
  curso: (id: string) => CursoComAulas;
  trilha: (id: string) => { cursos: readonly CursoComAulas[] };
}

function catalogoDo(linhas: LinhasDoResumo): CatalogoDoResumo {
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
  const curso = (id: string) => {
    const c = cursos.get(id);
    if (!c) {
      throw new Error(`Curso ${id} alcançado e fora do catálogo da busca.`);
    }
    return c;
  };
  const trilhas = new Map(
    linhas.trilhas.map((t) => [
      t.id as TrilhaId,
      { cursos: t.cursos.map(curso) },
    ])
  );
  return {
    curso,
    trilha: (id) => {
      const t = trilhas.get(id as TrilhaId);
      if (!t) {
        throw new Error(`Trilha ${id} liberada e fora do catálogo da busca.`);
      }
      return t;
    },
  };
}

const maisAntiga = (datas: readonly Date[]) =>
  datas.reduce((min, d) => (d < min ? d : min));

export function resumoDaPessoa(
  p: LinhasDaPessoa,
  catalogo: CatalogoDoResumo
): ResumoDaPessoa {
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
  const { soltos, trilhas } = alcance(
    ativas.flatMap((l) => (l.trilhaId ? [catalogo.trilha(l.trilhaId)] : [])),
    ativas.flatMap((l) => (l.cursoId ? [catalogo.curso(l.cursoId)] : [])),
    e.historico
  );
  const alcancados = [...trilhas.flatMap((t) => t.cursos), ...soltos];
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

/** A página do Clerk com o resumo de cada pessoa, na ordem do Clerk. */
export function montarBusca(
  resultado: ResultadoDaBusca,
  linhas: LinhasDoResumo,
  hoje: DiaISO
): BuscaDeAlunos {
  const catalogo = catalogoDo(linhas);
  const porPessoa = new Map(linhas.pessoas.map((p) => [p.userId, p]));
  return {
    hoje,
    pessoas: resultado.pessoas.map((pessoa) => {
      const p = porPessoa.get(pessoa.userId);
      if (!p) {
        throw new Error(`O statement da busca não trouxe ${pessoa.userId}.`);
      }
      return { ...pessoa, resumo: resumoDaPessoa(p, catalogo) };
    }),
    total: resultado.total,
  };
}
