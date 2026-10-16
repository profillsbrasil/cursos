import type {
  AulaDaPagina,
  ModuloDaPagina,
  PaginaDoCurso,
} from "@cursos/api/dominio/pagina-do-curso";
import type { AulaId } from "@cursos/api/dominio/tipos";
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
import { caminhoDaAula } from "@/lib/rotas";

/** Os parágrafos da descrição, sem linha vazia. O primeiro abre a página; o resto vai para "Sobre o curso". */
export const paragrafos = (descricao: string): string[] =>
  descricao
    .split("\n")
    .map((p) => p.trim())
    .filter((p) => p !== "");

const aulasDe = (modulos: readonly ModuloDaPagina[]) =>
  modulos.flatMap((m) => m.aulas);

const duracaoDe = (aulas: readonly AulaDaPagina[]) =>
  aulas.reduce((soma, a) => soma + a.duracaoSeg, 0);

/** "16 módulos", "90 aulas", "15 h 51 min" e, no curso com níveis, "3 níveis". */
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

/** "3:42", ou "1:02:05" depois de uma hora. */
export function tempo(seg: number): string {
  const s = Math.max(0, Math.floor(seg));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

/** A aula em que a pessoa está: a do Continuar. Antes da primeira aula, e na prova e no concluído, nenhuma. */
export const aulaAtual = (p: PaginaDoCurso): AulaId | null =>
  p.acao.tipo === "continuar" ? p.acao.aulaId : null;

/** Onde a pessoa parou na aula atual, só com posição acima de 0. */
export const parouEm = (p: PaginaDoCurso): string | null =>
  p.acao.tipo === "continuar" && p.acao.posicaoSeg > 0
    ? `Você parou em ${tempo(p.acao.posicaoSeg)}`
    : null;

const ATE_TODOS_ABERTOS = 3;

/**
 * Os módulos que a sanfona abre de saída: todos no curso de até 3 módulos; nos
 * outros, o da aula para onde o botão principal leva, e nenhum na prova e no concluído.
 */
export function abertosDeSaida(p: PaginaDoCurso): number[] {
  if (p.modulos.length <= ATE_TODOS_ABERTOS) {
    return p.modulos.map((m) => m.numero);
  }
  const { acao } = p;
  if (acao.tipo !== "comecar" && acao.tipo !== "continuar") {
    return [];
  }
  return p.modulos
    .filter((m) => m.aulas.some((a) => a.id === acao.aulaId))
    .map((m) => m.numero);
}

export type MarcaDoModulo = "feito" | "atual" | "pendente";

export function marcaDoModulo(
  m: ModuloDaPagina,
  atual: AulaId | null
): MarcaDoModulo {
  if (m.aulas.every((a) => a.assistida)) {
    return "feito";
  }
  return m.aulas.some((a) => a.id === atual) ? "atual" : "pendente";
}

/** A linha sob o título do módulo: o nível dele ou, sem nível, o tamanho. */
export const linhaDoModulo = (m: ModuloDaPagina): string =>
  m.nivel
    ? `Nível ${m.nivel.ordem} · ${m.nivel.nome}`
    : `${plural(m.aulas.length, "aula", "aulas")} · ${fmtHoras(duracaoDe(m.aulas))}`;

/**
 * A contagem à direita do módulo. Com o curso começado, "3 de 8 · 1 h 25 min".
 * Antes, o tamanho, a não ser que a linha sob o título já o diga.
 */
export function contagemDoModulo(
  m: ModuloDaPagina,
  comecou: boolean
): string | null {
  const duracao = fmtHoras(duracaoDe(m.aulas));
  if (comecou) {
    const feitas = m.aulas.filter((a) => a.assistida).length;
    return `${feitas} de ${m.aulas.length} · ${duracao}`;
  }
  return m.nivel
    ? `${plural(m.aulas.length, "aula", "aulas")} · ${duracao}`
    : null;
}

export const aulasAssistidas = ({
  feitas,
  total,
}: PaginaDoCurso["progresso"]) =>
  `${feitas} de ${plural(total, "aula assistida", "aulas assistidas")}`;

export type IconeDoCartao = "nivel" | "niveis" | "relogio" | "trofeu";

export interface LinhaDoCartao {
  icone: IconeDoCartao;
  texto: string;
}

export interface CartaoDoCurso {
  /** A aula da vez, ou o que falta no curso. */
  agora: { rotulo: string; titulo: string };
  botao: {
    href: Route;
    icone: "play" | "rever";
    texto: string;
    variante: "contorno" | "principal";
  };
  inclui: readonly LinhaDoCartao[];
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

const PROVA_NO_FIM: LinhaDoCartao = {
  icone: "trofeu",
  texto: "Prova e certificado no fim do curso",
};

/** O próximo nível ou, no curso sem níveis, que ele não tem; nada com todos os níveis obtidos. */
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

/** O que o cartão preso diz em cada estado. `hoje` é o dia de São Paulo, para a data do certificado. */
export function cartaoDoCurso(p: PaginaDoCurso, hoje: string): CartaoDoCurso {
  const { acao } = p;
  switch (acao.tipo) {
    case "comecar": {
      const { aula } = localizar(p, acao.aulaId);
      return {
        agora: {
          rotulo: `Comece por: Módulo ${acao.onde.modulo.numero}, ${acao.onde.modulo.titulo}`,
          titulo: `Aula ${acao.onde.aula} · ${aula.titulo}`,
        },
        botao: {
          href: acao.href as Route,
          icone: "play",
          texto: "Começar o curso",
          variante: "principal",
        },
        inclui: [
          {
            icone: "relogio",
            texto: `${fmtMin(aula.duracaoSeg)} na primeira aula`,
          },
          ...linhaDosNiveis(p),
          PROVA_NO_FIM,
        ],
      };
    }
    case "continuar": {
      const { aula } = localizar(p, acao.aulaId);
      const resta = minutos(aula.duracaoSeg - acao.posicaoSeg);
      return {
        agora: {
          rotulo: `Agora: Módulo ${acao.onde.modulo.numero}, ${acao.onde.modulo.titulo}`,
          titulo: `Aula ${acao.onde.aula} · ${aula.titulo}`,
        },
        botao: {
          href: acao.href as Route,
          icone: "play",
          texto:
            acao.posicaoSeg > 0
              ? `Continuar em ${tempo(acao.posicaoSeg)}`
              : "Continuar",
          variante: "principal",
        },
        inclui: [
          {
            icone: "relogio",
            texto: `${faltam(resta)} ${resta} min desta aula`,
          },
          ...linhaDosNiveis(p),
          PROVA_NO_FIM,
        ],
      };
    }
    case "prova": {
      const primeira = p.modulos[0]?.aulas[0];
      if (!primeira) {
        throw new Error(`Curso ${p.slug} na prova sem aulas`);
      }
      return {
        agora: {
          rotulo: "Você assistiu a todas as aulas",
          titulo: "Prova e certificado",
        },
        botao: {
          href: caminhoDaAula(p.slug, primeira.id),
          icone: "rever",
          texto: "Rever aulas",
          variante: "contorno",
        },
        inclui: [
          { icone: "trofeu", texto: "A prova abre em breve nesta página" },
        ],
      };
    }
    case "rever": {
      if (p.estado.tipo !== "concluido") {
        throw new Error(`Curso ${p.slug} com rever fora do concluído`);
      }
      const { certificado } = p.estado;
      return {
        agora: {
          rotulo: "Curso concluído",
          titulo: `Certificado emitido em ${diaCurto(diaEmSaoPaulo(certificado.emitidoEm), hoje)}`,
        },
        botao: {
          href: acao.href as Route,
          icone: "rever",
          texto: "Rever o curso",
          variante: "principal",
        },
        inclui: [
          {
            icone: "trofeu",
            texto: `Código do certificado: ${certificado.codigo}`,
          },
        ],
      };
    }
    default:
      return acao satisfies never;
  }
}
