import type { Progresso } from "@cursos/api/dominio/curso";
import type {
  AulaDaPagina,
  ModuloDaPagina,
  PaginaDoCurso,
} from "@cursos/api/dominio/pagina-do-curso";
import type { AulaId, DiaISO } from "@cursos/api/dominio/tipos";
import type { Route } from "next";

import {
  diaCurto,
  diaEmSaoPaulo,
  faltam,
  fmtHoras,
  fmtMin,
  minutos,
  plural,
} from "@/lib/formato";
import { caminhoDoCertificado } from "@/lib/rotas";

export const paragrafos = (descricao: string): string[] =>
  descricao
    .split("\n")
    .map((p) => p.trim())
    .filter((p) => p !== "");

const aulasDe = (modulos: readonly ModuloDaPagina[]) =>
  modulos.flatMap((m) => m.aulas);

const duracaoDe = (aulas: readonly AulaDaPagina[]) =>
  aulas.reduce((soma, a) => soma + a.duracaoSeg, 0);

export function resumoDoCurso(p: PaginaDoCurso): string[] {
  const aulas = aulasDe(p.modulos);
  const partes = [
    plural(p.modulos.length, "módulo", "módulos"),
    plural(aulas.length, "aula", "aulas"),
    fmtHoras(duracaoDe(aulas)),
  ];
  if (p.niveis.length > 0) {
    partes.push(plural(p.niveis.length, "nível", "níveis"));
  }
  return partes;
}

export function tempoDaPosicao(seg: number): string {
  const s = Math.max(0, Math.floor(seg));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

export const aulaAtual = (p: PaginaDoCurso): AulaId | null =>
  p.acao.tipo === "continuar" ? p.acao.aulaId : null;

export const parouEm = (p: PaginaDoCurso): string | null =>
  p.acao.tipo === "continuar" && p.acao.posicaoSeg > 0
    ? `Você parou em ${tempoDaPosicao(p.acao.posicaoSeg)}`
    : null;

const ATE_TODOS_ABERTOS = 3;

/** O questionário que a aula ainda deve: por fazer ou reprovado. */
export const questionarioPendente = (a: AulaDaPagina) =>
  a.questionario.tipo === "a_fazer" || a.questionario.tipo === "reprovado";

const questionariosPendentes = (m: ModuloDaPagina) =>
  m.aulas.filter(questionarioPendente).length;

/**
 * Os módulos abertos de saída: todos até 3; acima, o da aula de começar ou
 * continuar, ou, com as aulas assistidas, os que ainda devem questionário.
 */
export function abertosDeSaida(p: PaginaDoCurso): number[] {
  if (p.modulos.length <= ATE_TODOS_ABERTOS) {
    return p.modulos.map((m) => m.numero);
  }
  const { acao } = p;
  if (acao.tipo === "questionario") {
    return p.modulos
      .filter((m) => questionariosPendentes(m) > 0)
      .map((m) => m.numero);
  }
  if (acao.tipo !== "comecar" && acao.tipo !== "continuar") {
    return [];
  }
  return p.modulos
    .filter((m) => m.aulas.some((a) => a.id === acao.aulaId))
    .map((m) => m.numero);
}

export type MarcaDoModulo = "feito" | "atual" | "pendente" | "questionario";

/** Com as aulas do módulo assistidas, o que falta é o questionário de alguma delas. */
export function marcaDoModulo(
  m: ModuloDaPagina,
  atual: AulaId | null
): MarcaDoModulo {
  if (m.aulas.length > 0 && m.aulas.every((a) => a.assistida)) {
    return questionariosPendentes(m) > 0 ? "questionario" : "feito";
  }
  return m.aulas.some((a) => a.id === atual) ? "atual" : "pendente";
}

export function linhasDoModulo(
  m: ModuloDaPagina,
  comecou: boolean
): { direita: string | null; questionarios: string | null; sob: string } {
  if (m.aulas.length === 0) {
    return { direita: null, questionarios: null, sob: "Nenhuma aula ainda" };
  }
  const tamanho = `${plural(m.aulas.length, "aula", "aulas")} · ${fmtHoras(duracaoDe(m.aulas))}`;
  const sob = m.nivel ? `Nível ${m.nivel.ordem} · ${m.nivel.nome}` : tamanho;
  const pendentes = questionariosPendentes(m);
  const questionarios =
    marcaDoModulo(m, null) === "questionario"
      ? plural(pendentes, "questionário", "questionários")
      : null;
  if (comecou) {
    const feitas = m.aulas.filter((a) => a.assistida).length;
    return {
      direita: `${feitas} de ${m.aulas.length} · ${fmtHoras(duracaoDe(m.aulas))}`,
      questionarios,
      sob,
    };
  }
  return { direita: m.nivel ? tamanho : null, questionarios, sob };
}

/** O selo da aula no índice de livro, quando o questionário dela ainda falta. */
export function seloDoQuestionario(
  a: AulaDaPagina
): { tipo: "a_fazer" | "reprovado"; texto: string } | null {
  switch (a.questionario.tipo) {
    case "reprovado":
      return {
        texto: `Questionário: ${a.questionario.ultima.acertos} de ${a.questionario.ultima.total} na última tentativa`,
        tipo: "reprovado",
      };
    case "a_fazer":
      return a.assistida
        ? { texto: "Falta o questionário", tipo: "a_fazer" }
        : null;
    default:
      return null;
  }
}

export const aulasAssistidas = ({
  feitas,
  total,
}: PaginaDoCurso["progresso"]) =>
  `${feitas} de ${plural(total, "aula assistida", "aulas assistidas")}`;

/**
 * A barra do cartão: as aulas assistidas e, com todas assistidas e questionário
 * por aprovar, os questionários aprovados.
 */
export function progressoDoCartao(p: PaginaDoCurso): {
  linha: string;
  progresso: Progresso;
} {
  if (p.acao.tipo === "questionario") {
    const { questionarios } = p.acao;
    return {
      linha: `${questionarios.feitas} de ${plural(questionarios.total, "questionário aprovado", "questionários aprovados")}`,
      progresso: questionarios,
    };
  }
  return { linha: aulasAssistidas(p.progresso), progresso: p.progresso };
}

export type IconeDoCartao =
  | "certificado"
  | "check"
  | "nivel"
  | "niveis"
  | "questionario"
  | "relogio";

export interface LinhaDoCartao {
  href?: Route;
  icone: IconeDoCartao;
  texto: string;
}

export interface CartaoDoCurso {
  botao: {
    href: Route;
    icone: "play" | "questionario" | "rever";
    texto: string;
    variante: "contorno" | "principal";
  };
  inclui: readonly LinhaDoCartao[];
  situacao: { rotulo: string; titulo: string; ultimaTentativa: string | null };
}

function localizar(p: PaginaDoCurso, aulaId: AulaId) {
  for (const m of p.modulos) {
    const i = m.aulas.findIndex((a) => a.id === aulaId);
    const aula = m.aulas[i];
    if (aula) {
      return { aula, modulo: m, numero: i + 1 };
    }
  }
  throw new Error(`Aula ${aulaId} fora da página do curso ${p.slug}`);
}

const CERTIFICADO_NO_FIM: LinhaDoCartao = {
  icone: "certificado",
  texto: "Certificado no fim do curso",
};

function linhaDosNiveis(p: PaginaDoCurso): LinhaDoCartao[] {
  if (p.proximoNivel) {
    return [{ icone: "nivel", texto: `Próximo nível: ${p.proximoNivel.nome}` }];
  }
  if (p.niveis.length === 0) {
    return [
      {
        icone: "niveis",
        texto: `${plural(p.modulos.length, "módulo", "módulos")}, sem níveis`,
      },
    ];
  }
  return [];
}

export function cartaoDoCurso(p: PaginaDoCurso, hoje: DiaISO): CartaoDoCurso {
  const { acao } = p;
  switch (acao.tipo) {
    case "comecar": {
      const { aula } = localizar(p, acao.aulaId);
      return {
        botao: {
          href: acao.href as Route,
          icone: "play",
          texto: "Começar curso",
          variante: "principal",
        },
        inclui: [
          {
            icone: "relogio",
            texto: `${fmtMin(aula.duracaoSeg)} na primeira aula`,
          },
          ...linhaDosNiveis(p),
          CERTIFICADO_NO_FIM,
        ],
        situacao: {
          rotulo: `Comece por: Módulo ${acao.onde.modulo.numero}, ${acao.onde.modulo.titulo}`,
          titulo: `Aula ${acao.onde.aula} · ${aula.titulo}`,
          ultimaTentativa: null,
        },
      };
    }
    case "continuar": {
      const { aula } = localizar(p, acao.aulaId);
      const resta = minutos(aula.duracaoSeg - acao.posicaoSeg);
      return {
        botao: {
          href: acao.href as Route,
          icone: "play",
          texto:
            acao.posicaoSeg > 0
              ? `Continuar em ${tempoDaPosicao(acao.posicaoSeg)}`
              : "Continuar",
          variante: "principal",
        },
        inclui: [
          {
            icone: "relogio",
            texto: `${faltam(resta)} ${resta} min desta aula`,
          },
          ...linhaDosNiveis(p),
          CERTIFICADO_NO_FIM,
        ],
        situacao: {
          rotulo: `Agora: Módulo ${acao.onde.modulo.numero}, ${acao.onde.modulo.titulo}`,
          titulo: `Aula ${acao.onde.aula} · ${aula.titulo}`,
          ultimaTentativa: null,
        },
      };
    }
    case "questionario": {
      const { aula } = localizar(p, acao.aulaId);
      const faltamN = acao.questionarios.total - acao.questionarios.feitas;
      return {
        botao: {
          href: acao.href as Route,
          icone: "questionario",
          texto: acao.ultima ? "Tentar de novo" : "Fazer o questionário",
          variante: "principal",
        },
        inclui: [
          { icone: "check", texto: aulasAssistidas(p.progresso) },
          {
            icone: "questionario",
            texto:
              faltamN === 1
                ? "Falta 1 questionário"
                : `Faltam ${faltamN} questionários, um por aula`,
          },
          { icone: "certificado", texto: "Certificado quando todos passarem" },
        ],
        situacao: {
          rotulo: "Próximo questionário",
          titulo: `Módulo ${acao.onde.modulo.numero}, aula ${acao.onde.aula} · ${aula.titulo}`,
          ultimaTentativa: acao.ultima
            ? `${acao.ultima.acertos} de ${acao.ultima.total} na última tentativa`
            : null,
        },
      };
    }
    case "rever": {
      if (p.estado.tipo !== "concluido") {
        throw new Error(`Curso ${p.slug} com rever fora do concluído`);
      }
      const { certificado } = p.estado;
      return {
        botao: {
          href: acao.href as Route,
          icone: "rever",
          texto: "Rever o curso",
          variante: "principal",
        },
        inclui: [
          {
            href: caminhoDoCertificado(p.slug),
            icone: "certificado",
            texto: `Código do certificado: ${certificado.codigo}`,
          },
        ],
        situacao: {
          rotulo: "Curso concluído",
          titulo: `Certificado emitido em ${diaCurto(diaEmSaoPaulo(certificado.emitidoEm), hoje)}`,
          ultimaTentativa: null,
        },
      };
    }
    default:
      return acao satisfies never;
  }
}
