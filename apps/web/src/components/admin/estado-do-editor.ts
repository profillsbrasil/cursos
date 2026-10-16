import type { DocumentoDoCurso } from "@cursos/api/dominio/edicao-do-curso";
import { ALTERNATIVAS } from "@cursos/api/dominio/questionario";
import type {
  AlternativaId,
  AulaId,
  ModuloId,
  PerguntaId,
} from "@cursos/api/dominio/tipos";

import { type Direcao, trocado } from "@/lib/editor";
import type { RegrasDoRascunho } from "@/lib/use-rascunho-apoiado";

import type { Problema } from "./problemas";
import {
  type AulaDoRascunho,
  ID,
  lerNumeroDoModulo,
  type ModuloDoRascunho,
  mesmoRascunho,
  type PerguntaDoRascunho,
  type RascunhoDoCurso,
  rascunhoDoCurso,
} from "./rascunho-do-curso";

type CampoDoCurso = Exclude<
  keyof RascunhoDoCurso,
  "id" | "modulos" | "niveis" | "versao"
>;

export type Mudanca =
  | { tipo: "campos"; mudanca: Partial<Pick<RascunhoDoCurso, CampoDoCurso>> }
  | { tipo: "nivel_novo"; ordem: number }
  | { tipo: "nivel_renomeado"; ordem: number; nome: string }
  | { tipo: "nivel_removido"; ordem: number }
  | { tipo: "modulo_novo"; id: ModuloId }
  | {
      tipo: "modulo_editado";
      id: ModuloId;
      mudanca: Partial<
        Pick<ModuloDoRascunho, "nivelOrdem" | "numero" | "titulo">
      >;
    }
  | { tipo: "modulos_ordenados" }
  | { tipo: "modulo_movido"; id: ModuloId; direcao: Direcao }
  | { tipo: "modulo_removido"; id: ModuloId }
  | { tipo: "aula_nova"; moduloId: ModuloId; id: AulaId }
  | {
      tipo: "aula_editada";
      id: AulaId;
      mudanca: Partial<Omit<AulaDoRascunho, "id">>;
    }
  | { tipo: "aula_movida"; id: AulaId; direcao: Direcao }
  | { tipo: "aula_para_modulo"; id: AulaId; moduloId: ModuloId }
  | { tipo: "aula_removida"; id: AulaId }
  | {
      tipo: "pergunta_nova";
      aulaId: AulaId;
      id: PerguntaId;
      alternativas: readonly [AlternativaId, AlternativaId];
    }
  | { tipo: "pergunta_editada"; id: PerguntaId; enunciado: string }
  | { tipo: "pergunta_removida"; id: PerguntaId }
  | {
      tipo: "pergunta_restaurada";
      aulaId: AulaId;
      indice: number;
      pergunta: PerguntaDoRascunho;
    }
  | { tipo: "alternativa_nova"; perguntaId: PerguntaId; id: AlternativaId }
  | { tipo: "alternativa_editada"; id: AlternativaId; texto: string }
  | { tipo: "alternativa_removida"; id: AlternativaId }
  | {
      tipo: "certa_marcada";
      perguntaId: PerguntaId;
      alternativaId: AlternativaId;
    };

export const proximaOrdem = (niveis: RascunhoDoCurso["niveis"]) =>
  Math.max(0, ...niveis.map((n) => n.ordem)) + 1;

const numeroDe = (m: ModuloDoRascunho) => {
  const lido = lerNumeroDoModulo(m.numero);
  return "valor" in lido ? lido.valor : null;
};

const porNumero = (modulos: ModuloDoRascunho[]) =>
  modulos.toSorted(
    (a, b) =>
      (numeroDe(a) ?? Number.POSITIVE_INFINITY) -
      (numeroDe(b) ?? Number.POSITIVE_INFINITY)
  );

const comAulas = (
  r: RascunhoDoCurso,
  moduloId: ModuloId,
  trocar: (aulas: AulaDoRascunho[]) => AulaDoRascunho[] | null
): RascunhoDoCurso => {
  let mudou = false;
  const modulos = r.modulos.map((m) => {
    if (m.id !== moduloId) {
      return m;
    }
    const aulas = trocar(m.aulas);
    if (aulas === null) {
      return m;
    }
    mudou = true;
    return { ...m, aulas };
  });
  return mudou ? { ...r, modulos } : r;
};

const moduloDaAula = (r: RascunhoDoCurso, id: AulaId) =>
  r.modulos.find((m) => m.aulas.some((a) => a.id === id));

const aulaDaPergunta = (r: RascunhoDoCurso, id: PerguntaId) =>
  r.modulos
    .flatMap((m) => m.aulas)
    .find((a) => a.perguntas.some((p) => p.id === id));

const perguntaDaAlternativa = (r: RascunhoDoCurso, id: AlternativaId) =>
  r.modulos
    .flatMap((m) => m.aulas.flatMap((a) => a.perguntas))
    .find((p) => p.alternativas.some((x) => x.id === id));

const comPerguntas = (
  r: RascunhoDoCurso,
  aulaId: AulaId,
  trocar: (perguntas: PerguntaDoRascunho[]) => PerguntaDoRascunho[]
): RascunhoDoCurso => {
  const de = moduloDaAula(r, aulaId);
  return de
    ? comAulas(r, de.id, (aulas) =>
        aulas.map((a) =>
          a.id === aulaId ? { ...a, perguntas: trocar(a.perguntas) } : a
        )
      )
    : r;
};

const comPergunta = (
  r: RascunhoDoCurso,
  id: PerguntaId,
  trocar: (p: PerguntaDoRascunho) => PerguntaDoRascunho
): RascunhoDoCurso => {
  const aula = aulaDaPergunta(r, id);
  return aula
    ? comPerguntas(r, aula.id, (perguntas) =>
        perguntas.map((p) => (p.id === id ? trocar(p) : p))
      )
    : r;
};

const comAlternativa = (
  r: RascunhoDoCurso,
  id: AlternativaId,
  trocar: (p: PerguntaDoRascunho) => PerguntaDoRascunho
): RascunhoDoCurso => {
  const pergunta = perguntaDaAlternativa(r, id);
  return pergunta ? comPergunta(r, pergunta.id, trocar) : r;
};

export function mudar(r: RascunhoDoCurso, m: Mudanca): RascunhoDoCurso {
  switch (m.tipo) {
    case "campos":
      return { ...r, ...m.mudanca };
    case "nivel_novo":
      return { ...r, niveis: [...r.niveis, { nome: "", ordem: m.ordem }] };
    case "nivel_renomeado":
      return {
        ...r,
        niveis: r.niveis.map((n) =>
          n.ordem === m.ordem ? { ...n, nome: m.nome } : n
        ),
      };
    case "nivel_removido":
      return {
        ...r,
        modulos: r.modulos.map((x) =>
          x.nivelOrdem === m.ordem ? { ...x, nivelOrdem: null } : x
        ),
        niveis: r.niveis.filter((n) => n.ordem !== m.ordem),
      };
    case "modulo_novo": {
      const numero = Math.max(0, ...r.modulos.map((x) => numeroDe(x) ?? 0));
      return {
        ...r,
        modulos: [
          ...r.modulos,
          {
            aulas: [],
            id: m.id,
            nivelOrdem: null,
            numero: String(numero + 1),
            titulo: "",
          },
        ],
      };
    }
    case "modulo_editado":
      return {
        ...r,
        modulos: r.modulos.map((x) =>
          x.id === m.id ? { ...x, ...m.mudanca } : x
        ),
      };
    case "modulos_ordenados":
      return { ...r, modulos: porNumero(r.modulos) };
    case "modulo_movido": {
      const i = r.modulos.findIndex((x) => x.id === m.id);
      const modulos = trocado(r.modulos, i, m.direcao);
      if (modulos === null) {
        return r;
      }
      const j = m.direcao === "acima" ? i - 1 : i + 1;
      const a = modulos[i] as ModuloDoRascunho;
      const b = modulos[j] as ModuloDoRascunho;
      modulos[i] = { ...a, numero: b.numero };
      modulos[j] = { ...b, numero: a.numero };
      return { ...r, modulos };
    }
    case "modulo_removido":
      return { ...r, modulos: r.modulos.filter((x) => x.id !== m.id) };
    case "aula_nova":
      return comAulas(r, m.moduloId, (aulas) => [
        ...aulas,
        {
          descricao: "",
          duracao: "",
          id: m.id,
          perguntas: [],
          titulo: "",
          video: "",
        },
      ]);
    case "aula_editada": {
      const de = moduloDaAula(r, m.id);
      return de
        ? comAulas(r, de.id, (aulas) =>
            aulas.map((a) => (a.id === m.id ? { ...a, ...m.mudanca } : a))
          )
        : r;
    }
    case "aula_movida": {
      const de = moduloDaAula(r, m.id);
      return de
        ? comAulas(r, de.id, (aulas) =>
            trocado(
              aulas,
              aulas.findIndex((a) => a.id === m.id),
              m.direcao
            )
          )
        : r;
    }
    case "aula_para_modulo": {
      const de = moduloDaAula(r, m.id);
      const aula = de?.aulas.find((a) => a.id === m.id);
      if (
        !(de && aula) ||
        de.id === m.moduloId ||
        !r.modulos.some((x) => x.id === m.moduloId)
      ) {
        return r;
      }
      const sem = comAulas(r, de.id, (aulas) =>
        aulas.filter((a) => a.id !== m.id)
      );
      return comAulas(sem, m.moduloId, (aulas) => [...aulas, aula]);
    }
    case "aula_removida": {
      const de = moduloDaAula(r, m.id);
      return de
        ? comAulas(r, de.id, (aulas) => aulas.filter((a) => a.id !== m.id))
        : r;
    }
    case "pergunta_nova":
      return comPerguntas(r, m.aulaId, (perguntas) => [
        ...perguntas,
        {
          alternativas: m.alternativas.map((id) => ({
            certa: false,
            id,
            texto: "",
          })),
          enunciado: "",
          id: m.id,
        },
      ]);
    case "pergunta_editada":
      return comPergunta(r, m.id, (p) => ({ ...p, enunciado: m.enunciado }));
    case "pergunta_removida": {
      const aula = aulaDaPergunta(r, m.id);
      return aula
        ? comPerguntas(r, aula.id, (perguntas) =>
            perguntas.filter((p) => p.id !== m.id)
          )
        : r;
    }
    case "pergunta_restaurada":
      return comPerguntas(r, m.aulaId, (perguntas) =>
        perguntas.toSpliced(Math.min(m.indice, perguntas.length), 0, m.pergunta)
      );
    case "alternativa_nova":
      return comPergunta(r, m.perguntaId, (p) =>
        p.alternativas.length >= ALTERNATIVAS.max
          ? p
          : {
              ...p,
              alternativas: [
                ...p.alternativas,
                { certa: false, id: m.id, texto: "" },
              ],
            }
      );
    case "alternativa_editada":
      return comAlternativa(r, m.id, (p) => ({
        ...p,
        alternativas: p.alternativas.map((x) =>
          x.id === m.id ? { ...x, texto: m.texto } : x
        ),
      }));
    case "alternativa_removida":
      return comAlternativa(r, m.id, (p) =>
        p.alternativas.length <= ALTERNATIVAS.min
          ? p
          : {
              ...p,
              alternativas: p.alternativas.filter((x) => x.id !== m.id),
            }
      );
    case "certa_marcada":
      return comPergunta(r, m.perguntaId, (p) => ({
        ...p,
        alternativas: p.alternativas.map((x) => ({
          ...x,
          certa: x.id === m.alternativaId,
        })),
      }));
    default: {
      const nenhuma: never = m;
      throw new Error(`Mudança sem regra: ${JSON.stringify(nenhuma)}`);
    }
  }
}

export const REGRAS_DO_CURSO: RegrasDoRascunho<
  DocumentoDoCurso,
  RascunhoDoCurso,
  Mudanca
> = { deDocumento: rascunhoDoCurso, mesmo: mesmoRascunho, mudar };

/**
 * Os módulos que o admin deixou abertos no editor; fechado é o padrão. Fica
 * fora do rascunho, então não entra no sujo nem no documento salvo.
 */
export type Abertos = ReadonlySet<ModuloId>;

export const NENHUM_ABERTO: Abertos = new Set();

/**
 * Os blocos abertos quando o editor monta: o curso de um módulo só abre com ele
 * aberto, porque fechado ele custaria um clique sem esconder nada.
 */
export function abertosAoAbrir(r: RascunhoDoCurso): Abertos {
  const [unico, ...outros] = r.modulos;
  return unico && outros.length === 0 ? new Set([unico.id]) : NENHUM_ABERTO;
}

export type AcaoNosBlocos =
  | { tipo: "aberto"; id: ModuloId }
  | { tipo: "fechado"; id: ModuloId }
  /** O Salvar recusado pelo schema abre os módulos com campo marcado. */
  | { tipo: "erros_mostrados"; ids: readonly ModuloId[] }
  | { tipo: "mudou"; mudanca: Mudanca };

/** Os campos com erro na tela, pelo id do input. */
export type Marcados = Pick<ReadonlySet<string>, "has">;

/** Como o bloco aparece. O erro nunca fica num bloco fechado. */
export type Bloco =
  | { tipo: "fechado" }
  | { tipo: "aberto" }
  | { tipo: "com_erro"; campos: number };

const comAberto = (abertos: Abertos, id: ModuloId): Abertos =>
  abertos.has(id) ? abertos : new Set([...abertos, id]);

const semAberto = (abertos: Abertos, id: ModuloId): Abertos =>
  abertos.has(id) ? new Set([...abertos].filter((x) => x !== id)) : abertos;

/** O foco vai para dentro do módulo novo e do destino da aula movida. */
function abertosDepoisDe(abertos: Abertos, m: Mudanca): Abertos {
  switch (m.tipo) {
    case "modulo_novo":
      return comAberto(abertos, m.id);
    case "aula_para_modulo":
      return comAberto(abertos, m.moduloId);
    case "modulo_removido":
      return semAberto(abertos, m.id);
    default:
      return abertos;
  }
}

export function blocosAbertos(abertos: Abertos, a: AcaoNosBlocos): Abertos {
  switch (a.tipo) {
    case "aberto":
      return comAberto(abertos, a.id);
    case "fechado":
      return semAberto(abertos, a.id);
    case "erros_mostrados":
      return a.ids.reduce(comAberto, abertos);
    case "mudou":
      return abertosDepoisDe(abertos, a.mudanca);
    default: {
      const nenhuma: never = a;
      throw new Error(`Ação sem regra: ${JSON.stringify(nenhuma)}`);
    }
  }
}

const CAMPOS_DO_MODULO = ["nivel", "numero", "titulo"] as const;
const CAMPOS_DA_AULA = ["descricao", "duracao", "titulo", "video"] as const;

const idsDaPergunta = (p: PerguntaDoRascunho) => [
  ID.pergunta(p.id, "enunciado"),
  ID.pergunta(p.id, "alternativas"),
  ...p.alternativas.map((x) => ID.alternativa(x.id)),
];

const idsDaAula = (a: AulaDoRascunho) => [
  ...CAMPOS_DA_AULA.map((c) => ID.aula(a.id, c)),
  ...a.perguntas.flatMap(idsDaPergunta),
];

const contar = (ids: readonly string[], marcados: Marcados) =>
  ids.filter((id) => marcados.has(id)).length;

export const errosNaPergunta = (p: PerguntaDoRascunho, marcados: Marcados) =>
  contar(idsDaPergunta(p), marcados);

export const errosNaAula = (a: AulaDoRascunho, marcados: Marcados) =>
  contar(idsDaAula(a), marcados);

const camposComErro = (m: ModuloDoRascunho, marcados: Marcados) =>
  contar(
    [
      ...CAMPOS_DO_MODULO.map((c) => ID.modulo(m.id, c)),
      ...m.aulas.flatMap(idsDaAula),
    ],
    marcados
  );

export const modulosComErro = (
  r: RascunhoDoCurso,
  marcados: Marcados
): ModuloId[] =>
  r.modulos.flatMap((m) => (camposComErro(m, marcados) > 0 ? [m.id] : []));

export function blocoDoModulo(
  m: ModuloDoRascunho,
  abertos: Abertos,
  marcados: Marcados
): Bloco {
  const campos = camposComErro(m, marcados);
  if (campos > 0) {
    return { campos, tipo: "com_erro" };
  }
  return abertos.has(m.id) ? { tipo: "aberto" } : { tipo: "fechado" };
}

/**
 * Os módulos com erro na tela que ainda não estão entre os abertos. O editor
 * despacha a ação no render em que o erro aparece, e o bloco continua aberto
 * depois da correção. null: nada a abrir.
 */
export function abrirOsComErro(
  abertos: Abertos,
  r: RascunhoDoCurso,
  marcados: Marcados
): AcaoNosBlocos | null {
  const ids = modulosComErro(r, marcados).filter((id) => !abertos.has(id));
  return ids.length > 0 ? { ids, tipo: "erros_mostrados" } : null;
}

export const despacharNosDois =
  (
    mudarRascunho: (m: Mudanca) => void,
    mudarTela: (a: { tipo: "mudou"; mudanca: Mudanca }) => void
  ) =>
  (mudanca: Mudanca) => {
    mudarRascunho(mudanca);
    mudarTela({ mudanca, tipo: "mudou" });
  };

/** O grupo das letras não tem campo para sair: conta como deixado quando o enunciado e todas as alternativas foram deixados. */
export function comGrupoDasLetrasTocado(
  tocados: ReadonlySet<string>,
  r: RascunhoDoCurso
): ReadonlySet<string> {
  const certas = r.modulos
    .flatMap((m) => m.aulas.flatMap((a) => a.perguntas))
    .filter(
      (p) =>
        tocados.has(ID.pergunta(p.id, "enunciado")) &&
        p.alternativas.every((x) => tocados.has(ID.alternativa(x.id)))
    )
    .map((p) => ID.pergunta(p.id, "alternativas"))
    .filter((id) => !tocados.has(id));
  return certas.length > 0 ? new Set([...tocados, ...certas]) : tocados;
}

export interface Escolhas {
  aulaPorModulo: ReadonlyMap<ModuloId, AulaId>;
  perguntaPorAula: ReadonlyMap<AulaId, PerguntaId>;
}

export const NADA_ESCOLHIDO: Escolhas = {
  aulaPorModulo: new Map(),
  perguntaPorAula: new Map(),
};

export interface DonoDoCampo {
  aulaId: AulaId;
  moduloId: ModuloId;
  perguntaId: PerguntaId | null;
}

export type AcaoNasEscolhas =
  | { tipo: "aula_escolhida"; moduloId: ModuloId; aulaId: AulaId }
  | { tipo: "pergunta_escolhida"; aulaId: AulaId; perguntaId: PerguntaId }
  | { tipo: "campo_mostrado"; dono: DonoDoCampo }
  | { tipo: "mudou"; mudanca: Mudanca };

const comAula = (e: Escolhas, moduloId: ModuloId, aulaId: AulaId): Escolhas =>
  e.aulaPorModulo.get(moduloId) === aulaId
    ? e
    : { ...e, aulaPorModulo: new Map(e.aulaPorModulo).set(moduloId, aulaId) };

const comPerguntaEscolhida = (
  e: Escolhas,
  aulaId: AulaId,
  perguntaId: PerguntaId
): Escolhas =>
  e.perguntaPorAula.get(aulaId) === perguntaId
    ? e
    : {
        ...e,
        perguntaPorAula: new Map(e.perguntaPorAula).set(aulaId, perguntaId),
      };

function escolhasDepoisDe(e: Escolhas, m: Mudanca): Escolhas {
  switch (m.tipo) {
    case "aula_nova":
      return comAula(e, m.moduloId, m.id);
    case "aula_para_modulo":
      return comAula(e, m.moduloId, m.id);
    case "pergunta_nova":
      return comPerguntaEscolhida(e, m.aulaId, m.id);
    case "pergunta_restaurada":
      return comPerguntaEscolhida(e, m.aulaId, m.pergunta.id);
    default:
      return e;
  }
}

export function escolhas(e: Escolhas, a: AcaoNasEscolhas): Escolhas {
  switch (a.tipo) {
    case "aula_escolhida":
      return comAula(e, a.moduloId, a.aulaId);
    case "pergunta_escolhida":
      return comPerguntaEscolhida(e, a.aulaId, a.perguntaId);
    case "campo_mostrado": {
      const comADoCampo = comAula(e, a.dono.moduloId, a.dono.aulaId);
      return a.dono.perguntaId
        ? comPerguntaEscolhida(comADoCampo, a.dono.aulaId, a.dono.perguntaId)
        : comADoCampo;
    }
    case "mudou":
      return escolhasDepoisDe(e, a.mudanca);
    default: {
      const nenhuma: never = a;
      throw new Error(`Ação sem regra: ${JSON.stringify(nenhuma)}`);
    }
  }
}

export function aulaEscolhida(
  m: ModuloDoRascunho,
  e: Escolhas
): AulaDoRascunho | null {
  const id = e.aulaPorModulo.get(m.id);
  return m.aulas.find((a) => a.id === id) ?? m.aulas[0] ?? null;
}

export function perguntaEscolhida(
  a: AulaDoRascunho,
  e: Escolhas
): PerguntaDoRascunho | null {
  const id = e.perguntaPorAula.get(a.id);
  return a.perguntas.find((p) => p.id === id) ?? a.perguntas[0] ?? null;
}

export function donoDoCampo(
  r: RascunhoDoCurso,
  campo: string
): DonoDoCampo | null {
  for (const m of r.modulos) {
    for (const a of m.aulas) {
      if (CAMPOS_DA_AULA.some((c) => ID.aula(a.id, c) === campo)) {
        return { aulaId: a.id, moduloId: m.id, perguntaId: null };
      }
      const p = a.perguntas.find((x) => idsDaPergunta(x).includes(campo));
      if (p) {
        return { aulaId: a.id, moduloId: m.id, perguntaId: p.id };
      }
    }
  }
  return null;
}

/**
 * O que a tela marca. Antes do Salvar, só o erro dos campos que o admin já
 * deixou (`tocados`), como o "abc" na duração; depois do Salvar recusado,
 * tudo o que o Salvar recusaria (`achados`). A recusa do servidor aparece
 * sempre, enquanto o valor recusado continua no campo.
 */
export function problemasNaTela({
  achados,
  recusa,
  tentou,
  tocados,
}: {
  achados: readonly Problema[];
  recusa: readonly Problema[];
  tentou: boolean;
  tocados: ReadonlySet<string>;
}): Problema[] {
  const vistos = tentou
    ? achados
    : achados.filter((p) => p.campo !== null && tocados.has(p.campo));
  return [...vistos, ...recusa];
}
