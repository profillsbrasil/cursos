// Sem "use client": o editor e os testes importam.

import type { Motivo } from "@cursos/api";
import type {
  DocumentoDoCurso,
  MaterialDoDocumento,
} from "@cursos/api/dominio/edicao-do-curso";
import { LIMITES } from "@cursos/api/dominio/limites-do-curso";
import type { TipoDoMaterial } from "@cursos/api/dominio/material";
import { ALTERNATIVAS } from "@cursos/api/dominio/questionario";
import type {
  AlternativaId,
  AulaId,
  MaterialId,
  ModuloId,
  PerguntaId,
  Versao,
} from "@cursos/api/dominio/tipos";

import {
  type Apoio,
  apoioEm,
  apoioSalvo,
  type Direcao,
  sincronizarComAPagina,
  trocado,
} from "@/lib/editor";

import { errosPorCampo, type Problema } from "./problemas";
import {
  type AulaDoRascunho,
  ID,
  lerNumeroDoModulo,
  lerRascunho,
  type ModuloDoRascunho,
  mesmoRascunho,
  type PerguntaDoRascunho,
  type RascunhoDoCurso,
  rascunhoDoCurso,
} from "./rascunho-do-curso";

type CampoDoCurso = Exclude<
  keyof RascunhoDoCurso,
  "id" | "materiais" | "modulos" | "niveis" | "versao"
>;

export type Mudanca =
  | { tipo: "campos"; mudanca: Partial<Pick<RascunhoDoCurso, CampoDoCurso>> }
  | { tipo: "nivel_novo"; ordem: number }
  | { tipo: "nivel_renomeado"; ordem: number; nome: string }
  | { tipo: "nivel_removido"; ordem: number }
  | { tipo: "material_renomeado"; id: MaterialId; titulo: string }
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
    case "material_renomeado":
      return {
        ...r,
        materiais: r.materiais.map((x) =>
          x.id === m.id ? { ...x, titulo: m.titulo } : x
        ),
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
function abertosAoAbrir(r: RascunhoDoCurso): Abertos {
  const [unico, ...outros] = r.modulos;
  return unico && outros.length === 0 ? new Set([unico.id]) : NENHUM_ABERTO;
}

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

/** O grupo das letras não tem campo para sair: conta como deixado quando o enunciado e todas as alternativas foram deixados. */
function comGrupoDasLetrasTocado(
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

/** Os painéis passam a mostrar a aula e a pergunta donas do campo. */
function comODonoDoCampo(
  e: Escolhas,
  r: RascunhoDoCurso,
  campo: string
): Escolhas {
  for (const m of r.modulos) {
    for (const a of m.aulas) {
      if (CAMPOS_DA_AULA.some((c) => ID.aula(a.id, c) === campo)) {
        return comAula(e, m.id, a.id);
      }
      const p = a.perguntas.find((x) => idsDaPergunta(x).includes(campo));
      if (p) {
        return comPerguntaEscolhida(comAula(e, m.id, a.id), a.id, p.id);
      }
    }
  }
  return e;
}

/**
 * Um arquivo de material de apoio que ainda não entrou no rascunho: subindo para
 * o bucket ou recusado. Quando o envio volta, ele sai daqui e entra no rascunho.
 */
export interface EnvioDeMaterial {
  bytes: number;
  estado: { tipo: "enviando" } | { tipo: "recusado"; motivo: string };
  id: MaterialId;
  nomeDoArquivo: string;
  /** null quando a extensão não é de nenhum tipo aceito. */
  tipo: TipoDoMaterial | null;
}

/** O envio e o lugar da linha dele na seção, contando os materiais e os outros envios. */
interface EnvioNaLista extends EnvioDeMaterial {
  posicao: number;
}

export type LinhaDaLista =
  | { tipo: "material"; material: MaterialDoDocumento }
  | { tipo: "envio"; envio: EnvioDeMaterial };

/** As linhas da seção, de cima para baixo: os materiais do rascunho com cada envio no lugar dele. */
export function linhasDoMaterial(
  e: Pick<RascunhoDoEditor, "daGeracao" | "rascunho">
): LinhaDaLista[] {
  const linhas: LinhaDaLista[] = e.rascunho.materiais.map((material) => ({
    material,
    tipo: "material",
  }));
  for (const { posicao, ...envio } of e.daGeracao.envios) {
    linhas.splice(Math.min(posicao, linhas.length), 0, {
      envio,
      tipo: "envio",
    });
  }
  return linhas;
}

export const idDaLinha = (l: LinhaDaLista): MaterialId =>
  l.tipo === "material" ? l.material.id : l.envio.id;

/**
 * O inverso de linhasDoMaterial: os materiais vão ao rascunho na ordem das
 * linhas, e cada envio guarda a posição da linha dele.
 */
function comLinhas(
  e: RascunhoDoEditor,
  linhas: readonly LinhaDaLista[]
): RascunhoDoEditor {
  return {
    ...naGeracao(e, {
      envios: linhas.flatMap((l, posicao) =>
        l.tipo === "envio" ? [{ ...l.envio, posicao }] : []
      ),
    }),
    rascunho: {
      ...e.rascunho,
      materiais: linhas.flatMap((l) =>
        l.tipo === "material" ? [l.material] : []
      ),
    },
  };
}

/** As setas e o arrastar pela alça põem a linha no índice pedido; fora da lista, nada muda. */
function movido(
  e: RascunhoDoEditor,
  id: MaterialId,
  para: number
): RascunhoDoEditor {
  const linhas = linhasDoMaterial(e);
  const de = linhas.findIndex((l) => idDaLinha(l) === id);
  const linha = linhas[de];
  if (!linha || para === de || para < 0 || para >= linhas.length) {
    return e;
  }
  linhas.splice(de, 1);
  linhas.splice(para, 0, linha);
  return comLinhas(e, linhas);
}

const semALinha = (e: RascunhoDoEditor, id: MaterialId) =>
  comLinhas(
    e,
    linhasDoMaterial(e).filter((l) => idDaLinha(l) !== id)
  );

export const RECUSA_DO_LIMITE = `O curso tem no máximo ${LIMITES.materiais} arquivos de material de apoio. Tire um para pôr este.`;

/** O que volta ao início a cada recomeço do rascunho. */
interface DaGeracao {
  /** A capa escolhida e ainda não salva, que também deixa o editor sujo. */
  capa: File | null;
  /** Os arquivos de material de apoio subindo ou recusados, cada um no lugar da linha dele. */
  envios: readonly EnvioNaLista[];
  /** A linha que pede confirmação, como a do Apagar. */
  linha: string | null;
  /** O Salvar foi recusado aqui: a tela marca tudo o que ele recusaria. */
  tentou: boolean;
  /** Os campos que o admin já deixou. */
  tocados: ReadonlySet<string>;
}

const INICIO_DA_GERACAO: DaGeracao = {
  capa: null,
  envios: [],
  linha: null,
  tentou: false,
  tocados: new Set(),
};

/**
 * Tudo o que o editor do curso guarda: o documento e o rascunho apoiado nele,
 * os blocos abertos, as escolhas dos painéis, o que a tela marca e o foco.
 */
export interface RascunhoDoEditor {
  abertos: Abertos;
  apoio: Apoio<DocumentoDoCurso>;
  daGeracao: DaGeracao;
  escolhas: Escolhas;
  /** Os campos que disputam o foco depois do render; o primeiro na página leva. */
  foco: readonly string[] | null;
  /** Cresce a cada recomeço; a capa remonta com ela. */
  geracao: number;
  rascunho: RascunhoDoCurso;
}

export function rascunhoDoEditorEm(pagina: DocumentoDoCurso): RascunhoDoEditor {
  const rascunho = rascunhoDoCurso(pagina);
  return {
    abertos: abertosAoAbrir(rascunho),
    apoio: apoioEm(pagina),
    daGeracao: INICIO_DA_GERACAO,
    escolhas: NADA_ESCOLHIDO,
    foco: null,
    geracao: 0,
    rascunho,
  };
}

/** O que o Salvar manda, e o que a resposta do servidor precisa de volta. */
export interface Envio {
  capa: File | null;
  documento: DocumentoDoCurso;
  /** O documento novo abre com ?novo=1 e o perde no primeiro salvar. */
  novo: boolean;
  rascunho: RascunhoDoCurso;
}

export type AcaoDoAdmin =
  | Mudanca
  | { tipo: "aberto"; id: ModuloId }
  | { tipo: "fechado"; id: ModuloId }
  | { tipo: "aula_escolhida"; moduloId: ModuloId; aulaId: AulaId }
  | { tipo: "pergunta_escolhida"; aulaId: AulaId; perguntaId: PerguntaId }
  | { tipo: "saiu_do_campo"; id: string }
  | { tipo: "capa_escolhida"; arquivo: File | null }
  /** Os arquivos escolhidos, já conferidos no navegador: os recusados vêm com o motivo. */
  | { tipo: "materiais_escolhidos"; envios: readonly EnvioDeMaterial[] }
  | { tipo: "envio_tirado"; id: MaterialId }
  /** O índice conta todas as linhas da seção, também as dos envios. */
  | { tipo: "material_movido"; id: MaterialId; para: number }
  | { tipo: "material_removido"; id: MaterialId }
  | { tipo: "linha_pedida"; chave: string | null }
  | { tipo: "linha_fechada"; chave: string }
  | { tipo: "salvar" }
  /** O Recarregar recomeça da última página que chegou, e o refresh traz a seguinte. */
  | { tipo: "descartado" };

export type RespostaDoServidor =
  | { tipo: "pagina"; pagina: DocumentoDoCurso }
  /** O bucket guardou o arquivo; ele entra no rascunho no lugar da linha dele. */
  | { tipo: "material_recebido"; material: MaterialDoDocumento }
  | { tipo: "material_recusado"; id: MaterialId; motivo: string }
  /** O servidor gravou o envio; o que o admin editou depois fica. */
  | { tipo: "salvo"; envio: Envio; versao: Versao }
  /**
   * versao_mudou liga o aviso já, antes de o refresh trazer a página; a página
   * que chega decide se ele fica.
   */
  | { tipo: "recusado"; envio: Envio; motivo: Motivo | null };

export type AcaoDoEditor = AcaoDoAdmin | RespostaDoServidor;

const SEM_CAPA: Problema = {
  campo: ID.curso("capa"),
  mensagem: "Escolha a imagem da capa.",
};

const ehNovo = (e: RascunhoDoEditor) => e.apoio.base.versao === null;

/** O arquivo subindo também prende o admin: sair agora o perderia. */
const ehSujo = (e: RascunhoDoEditor) =>
  e.daGeracao.capa !== null ||
  e.daGeracao.envios.some((x) => x.estado.tipo === "enviando") ||
  !mesmoRascunho(rascunhoDoCurso(e.apoio.base), e.rascunho);

/** O que o Salvar recusa sem ir ao servidor, ou o envio quando não há nada. */
function leitura(e: RascunhoDoEditor): {
  achados: Problema[];
  envio: Envio | null;
} {
  const lido = lerRascunho(e.rascunho, e.apoio.base);
  const { capa } = e.daGeracao;
  const semCapa = ehNovo(e) && capa === null ? [SEM_CAPA] : [];
  if (lido.tipo === "problemas") {
    return { achados: [...lido.problemas, ...semCapa], envio: null };
  }
  if (semCapa.length > 0) {
    return { achados: semCapa, envio: null };
  }
  return {
    achados: [],
    envio: {
      capa,
      documento: lido.documento,
      novo: ehNovo(e),
      rascunho: e.rascunho,
    },
  };
}

export interface Tela {
  envio: Envio | null;
  /** A mensagem de cada campo marcado, pelo id do input. */
  erros: ReadonlyMap<string, string>;
  novo: boolean;
  problemas: Problema[];
  sujo: boolean;
  versaoMudou: boolean;
}

/**
 * O que a tela mostra. Antes do Salvar, só o erro dos campos que o admin já
 * deixou, como o "abc" na duração; depois do Salvar recusado, tudo o que o
 * Salvar recusaria.
 */
export function telaDo(e: RascunhoDoEditor): Tela {
  const { achados, envio } = leitura(e);
  const { tentou, tocados } = e.daGeracao;
  const deixados = comGrupoDasLetrasTocado(tocados, e.rascunho);
  const problemas = tentou
    ? achados
    : achados.filter((p) => p.campo !== null && deixados.has(p.campo));
  return {
    envio,
    erros: errosPorCampo(problemas),
    novo: ehNovo(e),
    problemas,
    sujo: ehSujo(e),
    versaoMudou: e.apoio.versaoDeFora,
  };
}

const naGeracao = (
  e: RascunhoDoEditor,
  mudanca: Partial<DaGeracao>
): RascunhoDoEditor => ({ ...e, daGeracao: { ...e.daGeracao, ...mudanca } });

const recomecado = (
  e: RascunhoDoEditor,
  apoio: Apoio<DocumentoDoCurso>
): RascunhoDoEditor => ({
  ...e,
  apoio,
  daGeracao: INICIO_DA_GERACAO,
  geracao: e.geracao + 1,
  rascunho: rascunhoDoCurso(apoio.base),
});

/** O Salvar com erro leva o painel e o foco ao primeiro campo marcado. */
function salvar(e: RascunhoDoEditor): RascunhoDoEditor {
  const { achados, envio } = leitura(e);
  if (envio) {
    return naGeracao(e, { tentou: false });
  }
  const campos = achados.flatMap((p) => (p.campo ? [p.campo] : []));
  return {
    ...naGeracao(e, { tentou: true }),
    escolhas: campos[0]
      ? comODonoDoCampo(e.escolhas, e.rascunho, campos[0])
      : e.escolhas,
    foco: campos,
  };
}

/**
 * Os arquivos que acabaram de ser escolhidos, com o que passa do teto de 20 já
 * recusado: contam os prontos do rascunho e os que estão subindo. Quem escolhe
 * envia só os que saem daqui como enviando.
 */
export function dentroDoLimite(
  e: Pick<RascunhoDoEditor, "daGeracao" | "rascunho">,
  novos: readonly EnvioDeMaterial[]
): EnvioDeMaterial[] {
  const subindo = e.daGeracao.envios.filter(
    (x) => x.estado.tipo === "enviando"
  ).length;
  let vagas = LIMITES.materiais - e.rascunho.materiais.length - subindo;
  return novos.map((x) => {
    if (x.estado.tipo !== "enviando") {
      return x;
    }
    vagas -= 1;
    return vagas >= 0
      ? x
      : { ...x, estado: { motivo: RECUSA_DO_LIMITE, tipo: "recusado" } };
  });
}

/**
 * O envio de outra geração (o admin pediu Recarregar enquanto o arquivo subia)
 * não entra: o rascunho dele foi jogado fora.
 */
function recebido(
  e: RascunhoDoEditor,
  material: MaterialDoDocumento
): RascunhoDoEditor {
  if (!e.daGeracao.envios.some((x) => x.id === material.id)) {
    return e;
  }
  return comLinhas(
    e,
    linhasDoMaterial(e).map((l) =>
      l.tipo === "envio" && l.envio.id === material.id
        ? { material, tipo: "material" }
        : l
    )
  );
}

function passo(e: RascunhoDoEditor, a: AcaoDoEditor): RascunhoDoEditor {
  switch (a.tipo) {
    case "aberto":
      return { ...e, abertos: comAberto(e.abertos, a.id) };
    case "fechado":
      return { ...e, abertos: semAberto(e.abertos, a.id) };
    case "aula_escolhida":
      return { ...e, escolhas: comAula(e.escolhas, a.moduloId, a.aulaId) };
    case "pergunta_escolhida":
      return {
        ...e,
        escolhas: comPerguntaEscolhida(e.escolhas, a.aulaId, a.perguntaId),
      };
    case "saiu_do_campo": {
      const { tocados } = e.daGeracao;
      return tocados.has(a.id)
        ? e
        : naGeracao(e, { tocados: new Set([...tocados, a.id]) });
    }
    case "capa_escolhida":
      return naGeracao(e, { capa: a.arquivo });
    case "materiais_escolhidos":
      return comLinhas(e, [
        ...linhasDoMaterial(e),
        ...a.envios.map((envio) => ({ envio, tipo: "envio" as const })),
      ]);
    case "envio_tirado":
    case "material_removido":
      return semALinha(e, a.id);
    case "material_movido":
      return movido(e, a.id, a.para);
    case "material_recebido":
      return recebido(e, a.material);
    case "material_recusado":
      return naGeracao(e, {
        envios: e.daGeracao.envios.map((x) =>
          x.id === a.id
            ? { ...x, estado: { motivo: a.motivo, tipo: "recusado" } }
            : x
        ),
      });
    case "linha_pedida":
      return naGeracao(e, { linha: a.chave });
    case "linha_fechada":
      return e.daGeracao.linha === a.chave ? naGeracao(e, { linha: null }) : e;
    case "salvar":
      return salvar(e);
    case "descartado":
      return recomecado(e, apoioEm(e.apoio.pagina));
    case "pagina": {
      const s = sincronizarComAPagina(e.apoio, {
        limpo: !ehSujo(e),
        pagina: a.pagina,
      });
      return s.recomecar ? recomecado(e, s.apoio) : { ...e, apoio: s.apoio };
    }
    case "salvo": {
      const gravado = { ...a.envio.documento, versao: a.versao };
      const { capa } = e.daGeracao;
      return {
        ...e,
        apoio: apoioSalvo(e.apoio, gravado),
        // A capa escolhida durante o salvar fica para o próximo.
        daGeracao:
          capa === a.envio.capa ? { ...e.daGeracao, capa: null } : e.daGeracao,
        rascunho: mesmoRascunho(e.rascunho, a.envio.rascunho)
          ? rascunhoDoCurso(gravado)
          : e.rascunho,
      };
    }
    case "recusado":
      return a.motivo === "versao_mudou"
        ? { ...e, apoio: { ...e.apoio, versaoDeFora: true } }
        : e;
    default:
      return {
        ...e,
        abertos: abertosDepoisDe(e.abertos, a),
        escolhas: escolhasDepoisDe(e.escolhas, a),
        rascunho: mudar(e.rascunho, a),
      };
  }
}

/**
 * Nenhum erro fica num bloco fechado: o bloco abre na ação em que o erro
 * aparece e continua aberto depois da correção.
 */
export function rascunhoDoEditor(
  antes: RascunhoDoEditor,
  a: AcaoDoEditor
): RascunhoDoEditor {
  const e = passo(antes, a);
  const { erros } = telaDo(e);
  const comErro = e.rascunho.modulos.flatMap((m) =>
    camposComErro(m, erros) > 0 && !e.abertos.has(m.id) ? [m.id] : []
  );
  return comErro.length > 0
    ? { ...e, abertos: comErro.reduce(comAberto, e.abertos) }
    : e;
}
