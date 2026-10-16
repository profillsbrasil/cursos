// A página do curso para o aluno, no formato da Udemy: o que o curso ensina, a ação
// principal e as aulas por módulo. Só monta a partir de um CursoAberto, então a
// regra de quem vê é a de montarCursoAberto, a mesma do player.

import type { CursoAberto } from "./aula";
import {
  type EstadoQueAbre,
  niveis,
  type Progresso,
  progresso,
  progressoDosQuestionarios,
  questionariosDoCurso,
} from "./curso";
import { type MarcaDoQuestionario, marcaDoQuestionario } from "./questionario";
import { aulaDeRetomada, type OndeNoCurso, ondeNoCurso } from "./retomada";
import { caminhoDaAula, caminhoDoQuestionario } from "./rotas";
import type { AulaId, Capa, NivelCatalogo } from "./tipos";

export interface AulaDaPagina {
  assistida: boolean;
  /** "" quando o admin não escreveu. */
  descricao: string;
  duracaoSeg: number;
  id: AulaId;
  questionario: MarcaDoQuestionario;
  titulo: string;
}

export interface ModuloDaPagina {
  aulas: readonly AulaDaPagina[];
  /** null no módulo fora de nível, e em todo módulo do curso sem níveis. */
  nivel: NivelCatalogo | null;
  numero: number;
  titulo: string;
}

/**
 * O botão principal. Começar e continuar levam à aula da retomada, a mesma do
 * Continuar de Meus cursos; `onde` é o módulo e o número dela. Com as aulas
 * assistidas e questionário por aprovar, leva ao questionário da próxima aula
 * pendente (a reprovada primeiro). O curso concluído leva à primeira aula, para rever.
 */
export type AcaoDaPagina =
  | { tipo: "comecar"; aulaId: AulaId; href: string; onde: OndeNoCurso }
  | {
      tipo: "continuar";
      aulaId: AulaId;
      href: string;
      onde: OndeNoCurso;
      posicaoSeg: number;
    }
  | {
      tipo: "questionario";
      aulaId: AulaId;
      href: string;
      onde: OndeNoCurso;
      /** Os questionários aprovados sobre os do curso: a barra do cartão. */
      questionarios: Progresso;
      /** A nota da última tentativa nessa aula; null antes da primeira. */
      ultima: { acertos: number; total: number } | null;
    }
  | { tipo: "rever"; aulaId: AulaId; href: string };

export interface PaginaDoCurso {
  acao: AcaoDaPagina;
  capa: Capa;
  categoria: string;
  /** "" quando o admin não escreveu. */
  descricao: string;
  estado: EstadoQueAbre;
  /** Em ordem de número, aulas em ordem de posição. */
  modulos: readonly ModuloDaPagina[];
  /** Em ordem; vazio no curso sem níveis. */
  niveis: readonly NivelCatalogo[];
  progresso: Progresso;
  /** O primeiro nível com aula que a pessoa ainda não terminou; null sem níveis ou com todos obtidos. */
  proximoNivel: NivelCatalogo | null;
  slug: string;
  titulo: string;
  /** "O que você vai aprender", em ordem. */
  topicos: readonly string[];
}

function acaoDe(c: CursoAberto): AcaoDaPagina {
  const { curso, estado, historico, atividade } = c;
  const { slug } = curso;
  switch (estado.tipo) {
    case "nao_iniciado":
    case "em_andamento": {
      const { aulaId, posicaoSeg } = aulaDeRetomada(
        curso,
        estado,
        historico,
        atividade
      );
      const onde = ondeNoCurso(curso, estado, historico, atividade);
      if (!onde) {
        throw new Error(`Curso ${slug} em ${estado.tipo} sem aula de retomada`);
      }
      const href = caminhoDaAula(slug, aulaId);
      return estado.tipo === "nao_iniciado"
        ? { aulaId, href, onde, tipo: "comecar" }
        : { aulaId, href, onde, posicaoSeg, tipo: "continuar" };
    }
    case "questionarios": {
      const onde = ondeNoCurso(curso, estado, historico, atividade);
      if (!onde) {
        throw new Error(`Curso ${slug} com questionário pendente sem aula`);
      }
      return {
        aulaId: estado.proximaAula,
        href: caminhoDoQuestionario(slug, estado.proximaAula),
        onde,
        questionarios: progressoDosQuestionarios(
          questionariosDoCurso(curso, historico)
        ),
        tipo: "questionario",
        ultima: historico.questionarios.get(estado.proximaAula)?.ultima ?? null,
      };
    }
    case "concluido": {
      const [primeira] = curso.modulos.flatMap((m) => m.aulas);
      if (!primeira) {
        throw new Error(`Curso ${slug} concluído sem aulas`);
      }
      return {
        aulaId: primeira.id,
        href: caminhoDaAula(slug, primeira.id),
        tipo: "rever",
      };
    }
    default: {
      const nenhum: never = estado;
      throw new Error(`Estado sem ação: ${JSON.stringify(nenhum)}`);
    }
  }
}

export function montarPaginaDoCurso(c: CursoAberto): PaginaDoCurso {
  const { curso } = c;
  const { assistidas, questionarios } = c.historico;
  const nivelPorOrdem = new Map(curso.niveis.map((n) => [n.ordem, n]));
  const { proximo } = niveis(curso, assistidas);
  return {
    acao: acaoDe(c),
    capa: curso.capa,
    categoria: curso.categoria,
    descricao: curso.descricao,
    estado: c.estado,
    modulos: curso.modulos.map((m) => ({
      aulas: m.aulas.map((a) => ({
        assistida: assistidas.has(a.id),
        descricao: a.descricao,
        duracaoSeg: a.duracaoSeg,
        id: a.id,
        questionario: marcaDoQuestionario(a.perguntas, questionarios.get(a.id)),
        titulo: a.titulo,
      })),
      nivel:
        m.nivelOrdem === null
          ? null
          : (nivelPorOrdem.get(m.nivelOrdem) ?? null),
      numero: m.numero,
      titulo: m.titulo,
    })),
    niveis: curso.niveis,
    progresso: progresso(curso, assistidas),
    proximoNivel: proximo && { nome: proximo.nome, ordem: proximo.ordem },
    slug: curso.slug,
    titulo: curso.titulo,
    topicos: curso.topicos,
  };
}
