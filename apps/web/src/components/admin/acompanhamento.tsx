// O selo, a frase e a barra do estudo, na busca e na tela de acesso. Sem "use
// client": a lista da busca é Server Component e a tela de acesso é cliente.

import type {
  Acompanhamento,
  SituacaoDaPessoa,
  SituacaoNoCurso,
} from "@cursos/api/dominio/acompanhamento";
import type { Progresso } from "@cursos/api/dominio/curso";
import type { LiberacaoNaTela } from "@cursos/api/dominio/liberacao";
import { cn } from "@cursos/ui/lib/utils";
import {
  BookOpen,
  Check,
  Clock,
  ListChecks,
  type LucideIcon,
  Minus,
  Play,
} from "lucide-react";

import { diaCurto, diaEmSaoPaulo, fmtNum, noDia, plural } from "@/lib/formato";

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

/**
 * A barra de 4 px das liberações; o texto ao lado carrega o número. A coluna do
 * texto tem piso de 5,5rem ("46 de 90 aulas" cabe), então as barras de uma lista
 * terminam no mesmo ponto em vez de encolher com o número.
 */
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
        "grid grid-cols-[minmax(0,1fr)_minmax(5.5rem,auto)] items-center gap-3 text-muted-foreground text-xs tabular-nums",
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
    case "nunca_abriu":
      return NUNCA_ABRIU;
    case "estudando":
      return ESTUDANDO;
    case "faltam_questionarios":
      return {
        classe: CHEIO_CANELA,
        icone: ListChecks,
        rotulo: "Faltam questionários",
      };
    case "concluido":
      return { classe: CHEIO_CEU, icone: Check, rotulo: "Concluído" };
    default:
      return tipo satisfies never;
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

/** A situação do curso, como o item da liberação a escreve. */
export function fraseDoCurso(c: Acompanhamento, hoje: string): Frase {
  const s = c.situacao;
  switch (s.tipo) {
    case "em_producao":
      return {
        quando: null,
        texto: "Em produção. A pessoa ainda não vê o curso",
      };
    case "nunca_abriu":
      return { quando: null, texto: "Nenhuma aula aberta" };
    case "estudando":
      return {
        quando: ultimoEstudo(s.ultimoEstudo, hoje),
        texto: `Módulo ${s.onde.modulo}, aula ${s.onde.aula}`,
      };
    case "faltam_questionarios":
      return {
        quando: ultimoEstudo(s.ultimoEstudo, hoje),
        texto: `${aulasVistas(c.progresso.total)}. ${s.aprovados} de ${plural(s.total, "questionário aprovado", "questionários aprovados")}`,
      };
    case "concluido":
      return { quando: null, texto: `Concluído ${noDia(s.em, hoje)}` };
    default:
      return s satisfies never;
  }
}

/**
 * O rodapé do item da liberação: quando chegou e, na revogada, quando saiu. No
 * formato curto, o mesmo do "Concluído em" da frase logo acima.
 */
export function dataDaLiberacao(l: LiberacaoNaTela, hoje: string): string {
  const curta = (iso: string) => diaCurto(diaEmSaoPaulo(iso), hoje);
  const quando = curta(l.liberadaEm);
  const chegou =
    l.origem === "troca"
      ? `Trocado por pontos em ${quando}`
      : `Liberada em ${quando}`;
  return l.acao.tipo === "revogada"
    ? `${chegou} · revogada em ${curta(l.acao.em)}`
    : chegou;
}

/** A linha de números da busca: "2 de 4 cursos concluídos · 1 em produção · último estudo ontem". */
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
      return `Com acesso desde ${diaCurto(r.desde, hoje)} · nenhuma aula aberta`;
    case "estudando":
    case "concluiu_tudo": {
      const { concluidos, cursos, emProducao } = r.numeros;
      return [
        cursos === 0
          ? "nenhum curso publicado"
          : `${fmtNum(concluidos)} de ${plural(cursos, "curso concluído", "cursos concluídos")}`,
        emProducao === 0 ? null : `${fmtNum(emProducao)} em produção`,
        ultimoEstudo(r.ultimoEstudo, hoje),
      ]
        .filter((parte) => parte !== null)
        .join(" · ");
    }
    default:
      return r satisfies never;
  }
}
