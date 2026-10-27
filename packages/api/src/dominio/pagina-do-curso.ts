// A página do curso para o aluno, no formato da Udemy: o que o curso ensina, a ação
// principal e as aulas por módulo. Só monta a partir de um CursoAberto, então a
// regra de quem vê é a de montarCursoAberto, a mesma do player.

import type { CursoAberto } from "./aula";
import { type EstadoQueAbre, niveis, type Progresso } from "./curso";
import type { OndeNoCurso } from "./curso-do-aluno";
import type { MaterialDaPagina } from "./material";
import { type MarcaDoQuestionario, marcaDoQuestionario } from "./questionario";
import { caminhoDaAula, caminhoDoQuestionario } from "./rotas";
import type { AulaId, Capa, CursoId, NivelCatalogo } from "./tipos";

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

/**
 * A coluna de troca da amostra: a aula que toca e o preço do curso inteiro.
 * `preco` null é o curso publicado antes da regra do preço, que não se troca.
 */
export interface AmostraDaPagina {
  aulaId: AulaId;
  cursoId: CursoId;
  href: string;
  preco: number | null;
  saldo: number;
}

export interface PaginaDoCurso {
  acao: AcaoDaPagina;
  /** null no curso inteiro. */
  amostra: AmostraDaPagina | null;
  capa: Capa;
  categoria: string;
  /** "" quando o admin não escreveu. */
  descricao: string;
  estado: EstadoQueAbre;
  /** O material de apoio, em ordem; vazio quando o admin não anexou nada. */
  materiais: readonly MaterialDaPagina[];
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
  const { curso, historico } = c;
  const { aulaDaVez, estado, questionarios } = c.leitura;
  const { slug } = curso;
  if (estado.tipo === "concluido") {
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
  if (!aulaDaVez) {
    throw new Error(`Curso ${slug} em ${estado.tipo} sem aula da vez`);
  }
  const { id: aulaId, onde, posicaoSeg } = aulaDaVez;
  switch (estado.tipo) {
    case "nao_iniciado":
      return {
        aulaId,
        href: caminhoDaAula(slug, aulaId),
        onde,
        tipo: "comecar",
      };
    case "em_andamento":
      return {
        aulaId,
        href: caminhoDaAula(slug, aulaId),
        onde,
        posicaoSeg,
        tipo: "continuar",
      };
    case "questionarios":
      return {
        aulaId,
        href: caminhoDoQuestionario(slug, aulaId),
        onde,
        questionarios,
        tipo: "questionario",
        ultima: historico.questionarios.get(aulaId)?.ultima ?? null,
      };
    default: {
      const nenhum: never = estado;
      throw new Error(`Estado sem ação: ${JSON.stringify(nenhum)}`);
    }
  }
}

/** `saldo` só pesa na amostra. */
export function montarPaginaDoCurso(
  c: CursoAberto,
  materiais: readonly MaterialDaPagina[],
  saldo: number
): PaginaDoCurso {
  const { curso } = c;
  const { assistidas, questionarios } = c.historico;
  const nivelPorOrdem = new Map(curso.niveis.map((n) => [n.ordem, n]));
  const { proximo } = niveis(curso, assistidas);
  return {
    acao: acaoDe(c),
    amostra: c.amostra && {
      aulaId: c.amostra.aulaId,
      cursoId: curso.id,
      href: caminhoDaAula(curso.slug, c.amostra.aulaId),
      preco: c.amostra.preco,
      saldo,
    },
    capa: curso.capa,
    categoria: curso.categoria,
    descricao: curso.descricao,
    estado: c.leitura.estado,
    materiais,
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
    progresso: c.leitura.progresso,
    proximoNivel: proximo && { nome: proximo.nome, ordem: proximo.ordem },
    slug: curso.slug,
    titulo: curso.titulo,
    topicos: curso.topicos,
  };
}
