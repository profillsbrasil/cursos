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
import { caminhoDaAula } from "@/lib/rotas";

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
  if (m.aulas.length > 0 && m.aulas.every((a) => a.assistida)) {
    return "feito";
  }
  return m.aulas.some((a) => a.id === atual) ? "atual" : "pendente";
}

export function linhasDoModulo(
  m: ModuloDaPagina,
  comecou: boolean
): { direita: string | null; sob: string } {
  if (m.aulas.length === 0) {
    return { direita: null, sob: "Nenhuma aula ainda" };
  }
  const tamanho = `${plural(m.aulas.length, "aula", "aulas")} · ${fmtHoras(duracaoDe(m.aulas))}`;
  const sob = m.nivel ? `Nível ${m.nivel.ordem} · ${m.nivel.nome}` : tamanho;
  if (comecou) {
    const feitas = m.aulas.filter((a) => a.assistida).length;
    return {
      direita: `${feitas} de ${m.aulas.length} · ${fmtHoras(duracaoDe(m.aulas))}`,
      sob,
    };
  }
  return { direita: m.nivel ? tamanho : null, sob };
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
  botao: {
    href: Route;
    icone: "play" | "rever";
    texto: string;
    variante: "contorno" | "principal";
  };
  inclui: readonly LinhaDoCartao[];
  situacao: { rotulo: string; titulo: string };
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
        situacao: {
          rotulo: `Comece por: Módulo ${acao.onde.modulo.numero}, ${acao.onde.modulo.titulo}`,
          titulo: `Aula ${acao.onde.aula} · ${aula.titulo}`,
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
          PROVA_NO_FIM,
        ],
        situacao: {
          rotulo: `Agora: Módulo ${acao.onde.modulo.numero}, ${acao.onde.modulo.titulo}`,
          titulo: `Aula ${acao.onde.aula} · ${aula.titulo}`,
        },
      };
    }
    case "prova": {
      const [primeira] = p.modulos.flatMap((m) => m.aulas);
      if (!primeira) {
        throw new Error(`Curso ${p.slug} na prova sem aulas`);
      }
      return {
        botao: {
          href: caminhoDaAula(p.slug, primeira.id),
          icone: "rever",
          texto: "Rever aulas",
          variante: "contorno",
        },
        inclui: [
          { icone: "trofeu", texto: "A prova abre em breve nesta página" },
        ],
        situacao: {
          rotulo: "Você assistiu a todas as aulas",
          titulo: "Prova e certificado",
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
            icone: "trofeu",
            texto: `Código do certificado: ${certificado.codigo}`,
          },
        ],
        situacao: {
          rotulo: "Curso concluído",
          titulo: `Certificado emitido em ${diaCurto(diaEmSaoPaulo(certificado.emitidoEm), hoje)}`,
        },
      };
    }
    default:
      return acao satisfies never;
  }
}
