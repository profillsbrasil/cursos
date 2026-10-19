/** O que a tela lê de uma sessão do Clerk (`user.getSessions()`). */
export interface SessaoDoClerk {
  id: string;
  lastActiveAt: Date;
  latestActivity: {
    browserName?: string;
    city?: string;
    country?: string;
    deviceType?: string;
    isMobile?: boolean;
  };
}

export interface Aparelho {
  celular: boolean;
  id: string;
  /** "Chrome no Windows". */
  nome: string;
  /** "Curitiba · quinta às 10h32", ou só o quando, sem cidade. */
  onde: string;
}

export interface Aparelhos {
  /** Os acessos que ficam recolhidos em "Mais N acessos antigos". */
  antigos: Aparelho[];
  /** Null quando o Clerk não lista a sessão desta aba. */
  atual: Aparelho | null;
  /** Os outros acessos mais recentes, à vista. */
  recentes: Aparelho[];
}

export const RECENTES_A_VISTA = 3;

const FUSO = "America/Sao_Paulo";
const DIA = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO });
const HORA = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  hourCycle: "h23",
  minute: "2-digit",
  timeZone: FUSO,
});
const DATA_CURTA = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const DATA_CURTA_COM_ANO = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  year: "numeric",
});
const DIA_DA_SEMANA = [
  "domingo",
  "segunda",
  "terça",
  "quarta",
  "quinta",
  "sexta",
  "sábado",
];
const MS_POR_DIA = 86_400_000;

const diaEmSaoPaulo = (d: Date) => new Date(`${DIA.format(d)}T00:00:00Z`);

/** "10h32", no relógio de São Paulo. */
function hora(d: Date) {
  const partes = HORA.formatToParts(d);
  const h = partes.find((p) => p.type === "hour")?.value ?? "";
  const m = partes.find((p) => p.type === "minute")?.value ?? "";
  return `${h}h${m}`;
}

/** "hoje às 10h32", "ontem às 19h40", "quinta às 10h32" ou "2 de out.". */
export function quandoFoi(d: Date, agora: Date): string {
  const dia = diaEmSaoPaulo(d);
  const hoje = diaEmSaoPaulo(agora);
  const atras = Math.round((hoje.getTime() - dia.getTime()) / MS_POR_DIA);
  if (atras <= 0) {
    return `hoje às ${hora(d)}`;
  }
  if (atras === 1) {
    return `ontem às ${hora(d)}`;
  }
  if (atras < 7) {
    return `${DIA_DA_SEMANA[dia.getUTCDay()]} às ${hora(d)}`;
  }
  const formato =
    dia.getUTCFullYear() === hoje.getUTCFullYear()
      ? DATA_CURTA
      : DATA_CURTA_COM_ANO;
  return formato.format(dia);
}

/** O nome que o Clerk lê do user agent e o que a pessoa reconhece. */
const SISTEMAS: Record<string, string> = { Macintosh: "Mac", X11: "Linux" };

function nomeDo(a: SessaoDoClerk["latestActivity"]): string {
  const lido = a.deviceType?.trim();
  const sistema = lido ? (SISTEMAS[lido] ?? lido) : undefined;
  const navegador = a.browserName?.trim();
  if (navegador && sistema) {
    return `${navegador} no ${sistema}`;
  }
  return navegador || sistema || (a.isMobile ? "Celular" : "Computador");
}

function aparelho(s: SessaoDoClerk, quando: string): Aparelho {
  const a = s.latestActivity;
  const lugar = a.city?.trim() || a.country?.trim();
  return {
    celular: a.isMobile === true,
    id: s.id,
    nome: nomeDo(a),
    onde: lugar ? `${lugar} · ${quando}` : quando,
  };
}

/**
 * A sessão desta aba primeiro, as outras do acesso mais novo para o mais velho:
 * as três primeiras à vista e o resto recolhido.
 */
export function aparelhosDe(
  sessoes: readonly SessaoDoClerk[],
  idDaAtual: string | null,
  agora: Date
): Aparelhos {
  const atual = sessoes.find((s) => s.id === idDaAtual);
  const outras = sessoes
    .filter((s) => s.id !== idDaAtual)
    .toSorted((a, b) => b.lastActiveAt.getTime() - a.lastActiveAt.getTime())
    .map((s) => aparelho(s, quandoFoi(s.lastActiveAt, agora)));
  return {
    antigos: outras.slice(RECENTES_A_VISTA),
    atual: atual ? aparelho(atual, "agora") : null,
    recentes: outras.slice(0, RECENTES_A_VISTA),
  };
}
