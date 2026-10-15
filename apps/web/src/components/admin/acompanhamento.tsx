// O selo, a frase e a barra do estudo, na busca e na tela de acesso. Sem "use
// client": a lista da busca é Server Component e a tela de acesso é cliente.

import type {
  Acompanhamento,
  CursoAcompanhado,
  SituacaoDaPessoa,
  SituacaoNoCurso,
} from "@cursos/api/dominio/acompanhamento";
import type { Progresso } from "@cursos/api/dominio/curso";
import { cn } from "@cursos/ui/lib/utils";
import {
  BookOpen,
  Check,
  ClipboardCheck,
  Clock,
  Lock,
  type LucideIcon,
  Minus,
  Play,
} from "lucide-react";

import { diaCurto, fmtNum, noDia, plural } from "@/lib/formato";

import { SELO } from "./partes";

export interface Selo {
  classe: string;
  icone: LucideIcon;
  rotulo: string;
}

export function SeloDeSituacao({
  className,
  selo: { classe, icone: Icone, rotulo },
}: {
  className?: string;
  selo: Selo;
}) {
  return (
    <span className={cn(SELO, "gap-1.5", classe, className)}>
      <Icone aria-hidden="true" strokeWidth={2.4} />
      {rotulo}
    </span>
  );
}

/** A barra de 4 px do cartão Continuar; o texto ao lado carrega o número. */
export function BarraDeAulas({
  className,
  progresso: { feitas, pct, total },
}: {
  className?: string;
  progresso: Progresso;
}) {
  return (
    <span
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-muted-foreground text-xs tabular-nums",
        className
      )}
    >
      <span
        aria-hidden="true"
        className="h-1 min-w-16 overflow-hidden rounded-full bg-trilho"
      >
        <span
          className="block h-full rounded-full bg-sol"
          style={{ width: `${pct}%` }}
        />
      </span>
      {fmtNum(feitas)} de {plural(total, "aula", "aulas")}
    </span>
  );
}

// As cores dos selos de estado do DESIGN.md. Nenhum vermelho: parar de estudar não é erro.
const CHEIO_CEU = "bg-ceu text-sobre-cor";
const SOL_SUAVE = "bg-sol/14 text-sol";
const CHEIO_CANELA = "bg-canela text-sobre-cor";
const NEUTRO = "bg-popover text-foreground";
const CONTORNO_CEU = "bg-transparent text-ceu ring-1 ring-ceu ring-inset";
const CONTORNO_APAGADO =
  "bg-transparent text-muted-foreground ring-1 ring-muted-foreground ring-inset";

const ESTUDANDO: Selo = { classe: SOL_SUAVE, icone: Play, rotulo: "Estudando" };
const NUNCA_ABRIU: Selo = {
  classe: NEUTRO,
  icone: BookOpen,
  rotulo: "Nunca abriu",
};

export function seloDoCurso(tipo: SituacaoNoCurso["tipo"]): Selo {
  switch (tipo) {
    case "em_producao":
      return { classe: CONTORNO_CEU, icone: Clock, rotulo: "Em produção" };
    case "bloqueado":
      return { classe: CONTORNO_APAGADO, icone: Lock, rotulo: "Bloqueado" };
    case "nunca_abriu":
      return NUNCA_ABRIU;
    case "estudando":
      return ESTUDANDO;
    case "falta_prova":
      return {
        classe: CHEIO_CANELA,
        icone: ClipboardCheck,
        rotulo: "Falta a prova",
      };
    case "concluido":
      return { classe: CHEIO_CEU, icone: Check, rotulo: "Concluído" };
    default:
      return tipo satisfies never;
  }
}

type DaTrilha = Extract<Acompanhamento, { tipo: "trilha" }>;

const cursoDaVez = (a: DaTrilha) =>
  a.daVez === null ? undefined : a.cursos.find((c) => c.posicao === a.daVez);

/** O servidor decide a situação do item; aqui ela só ganha cor, ícone e palavra. */
export function seloDaLiberacao(a: Acompanhamento): Selo {
  if (a.tipo === "curso") {
    return seloDoCurso(a.curso.situacao.tipo);
  }
  const { situacao } = a;
  switch (situacao) {
    case "concluida":
      return { classe: CHEIO_CEU, icone: Check, rotulo: "Concluída" };
    case "aguardando_producao":
      return {
        classe: CONTORNO_CEU,
        icone: Clock,
        rotulo: "Aguardando produção",
      };
    default:
      return seloDoCurso(situacao);
  }
}

export function seloDaPessoa(r: SituacaoDaPessoa): Selo {
  switch (r.tipo) {
    case "sem_liberacao":
      return {
        classe: CONTORNO_APAGADO,
        icone: Minus,
        rotulo: "Sem liberação",
      };
    case "nunca_abriu":
      return NUNCA_ABRIU;
    case "estudando":
      return ESTUDANDO;
    case "concluiu_tudo":
      return { classe: CHEIO_CEU, icone: Check, rotulo: "Concluiu tudo" };
    default:
      return r satisfies never;
  }
}

/** O que a frase diz e, à parte e apagado, quando foi. */
export interface Frase {
  quando: string | null;
  texto: string;
}

const ultimoEstudo = (dia: string, hoje: string) =>
  `último estudo ${noDia(dia, hoje)}`;

const aulasVistas = (total: number) =>
  total === 1 ? "Viu a aula" : `Viu as ${fmtNum(total)} aulas`;

/** A situação de um curso, como o item da liberação ou a linha da trilha a escreve. */
export function fraseDoCurso(c: CursoAcompanhado, hoje: string): Frase {
  const s = c.situacao;
  switch (s.tipo) {
    case "em_producao":
      return {
        quando: null,
        texto: "Em produção. A pessoa ainda não vê o curso",
      };
    case "bloqueado":
      return {
        quando: null,
        texto: `Abre depois do curso ${s.depoisDe.posicao}, ${s.depoisDe.titulo}`,
      };
    case "nunca_abriu":
      return { quando: null, texto: "Nenhuma aula aberta" };
    case "estudando":
      return {
        quando: ultimoEstudo(s.ultimoEstudo, hoje),
        texto: `Módulo ${s.onde.modulo}, aula ${s.onde.aula}`,
      };
    case "falta_prova":
      return {
        quando: ultimoEstudo(s.ultimoEstudo, hoje),
        texto: `${aulasVistas(c.progresso.total)}. Falta a prova`,
      };
    case "concluido":
      return { quando: null, texto: `Concluído ${noDia(s.em, hoje)}` };
    default:
      return s satisfies never;
  }
}

const minuscula = (texto: string) =>
  `${texto.charAt(0).toLowerCase()}${texto.slice(1)}`;

/** A linha de um curso dentro da trilha: o estado e o detalhe numa frase curta. */
export function fraseNaTrilha(c: CursoAcompanhado, hoje: string): string {
  const s = c.situacao;
  switch (s.tipo) {
    case "estudando":
      return `Estudando · módulo ${s.onde.modulo}, aula ${s.onde.aula} · ${ultimoEstudo(s.ultimoEstudo, hoje)}`;
    case "falta_prova":
      return `Falta a prova · ${ultimoEstudo(s.ultimoEstudo, hoje)}`;
    case "bloqueado":
      return `Abre depois do curso ${s.depoisDe.posicao}`;
    case "em_producao":
    case "nunca_abriu":
      return seloDoCurso(s.tipo).rotulo;
    case "concluido":
      return fraseDoCurso(c, hoje).texto;
    default:
      return s satisfies never;
  }
}

/** "O curso 2 está em produção", "Os cursos 2 e 3 estão em produção". */
function osCursos(posicoes: readonly number[]) {
  const lista = new Intl.ListFormat("pt-BR", { type: "conjunction" }).format(
    posicoes.map(String)
  );
  return posicoes.length === 1
    ? `O curso ${lista} está em produção`
    : `Os cursos ${lista} estão em produção`;
}

export function fraseDaLiberacao(a: Acompanhamento, hoje: string): Frase {
  if (a.tipo === "curso") {
    return fraseDoCurso(a.curso, hoje);
  }
  const total = a.cursos.length;
  const quando = a.ultimoEstudo ? ultimoEstudo(a.ultimoEstudo, hoje) : null;
  switch (a.situacao) {
    case "concluida":
      return {
        quando,
        texto:
          total === 1
            ? "Concluiu o curso da trilha"
            : `Concluiu os ${fmtNum(total)} cursos`,
      };
    case "aguardando_producao": {
      const emProducao = a.cursos
        .filter((c) => c.situacao.tipo === "em_producao")
        .map((c) => c.posicao);
      const feitos = `Concluiu ${fmtNum(a.concluidos)} de ${plural(total, "curso", "cursos")}`;
      return {
        quando,
        texto:
          emProducao.length > 0 ? `${feitos}. ${osCursos(emProducao)}` : feitos,
      };
    }
    // A frase é do curso da vez; o último estudo é o da trilha inteira, que
    // conta o curso concluído antes dele.
    case "nunca_abriu":
    case "estudando":
    case "falta_prova": {
      const daVez = cursoDaVez(a);
      if (!daVez) {
        return { quando, texto: "Nenhum curso aberto" };
      }
      return {
        quando,
        texto: `Curso ${daVez.posicao} de ${total}, ${daVez.titulo}: ${minuscula(fraseDoCurso(daVez, hoje).texto)}`,
      };
    }
    default:
      return a.situacao satisfies never;
  }
}

/** A linha de números da busca: "5 liberações · 2 de 5 cursos concluídos · último estudo ontem". */
export function fraseDaPessoa(r: SituacaoDaPessoa, hoje: string): string {
  switch (r.tipo) {
    case "sem_liberacao":
      if (r.revogadas === 0 || r.ultimaRevogacao === null) {
        return "Nunca recebeu liberação";
      }
      return r.revogadas === 1
        ? `1 liberação revogada ${noDia(r.ultimaRevogacao, hoje)}`
        : `${fmtNum(r.revogadas)} liberações revogadas, a última ${noDia(r.ultimaRevogacao, hoje)}`;
    case "nunca_abriu":
      return `${plural(r.numeros.liberacoes, "liberação", "liberações")} desde ${diaCurto(r.desde, hoje)} · nenhuma aula aberta`;
    case "estudando":
    case "concluiu_tudo": {
      const { concluidos, cursos, liberacoes } = r.numeros;
      return [
        plural(liberacoes, "liberação", "liberações"),
        cursos === 0
          ? "nenhum curso publicado"
          : `${fmtNum(concluidos)} de ${plural(cursos, "curso concluído", "cursos concluídos")}`,
        ultimoEstudo(r.ultimoEstudo, hoje),
      ].join(" · ");
    }
    default:
      return r satisfies never;
  }
}
