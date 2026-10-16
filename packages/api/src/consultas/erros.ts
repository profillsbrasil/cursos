// Erro do Postgres que vira ErroParaAPessoa: a violação de restrição, com mensagem
// para o admin, e o lock_timeout, com TOO_MANY_REQUESTS.
// erros.integration.test.ts amarra a tabela ao banco nos dois sentidos: toda chave
// daqui existe lá, e toda restrição que uma escrita do admin pode violar está aqui
// ou em SEM_MENSAGEM_PROPRIA.

import type { TRPC_ERROR_CODE_KEY } from "@trpc/server";

import type { Motivo } from "../index";

const CODIGOS = new Set(["23503", "23505", "23514"]);

/** lock_not_available: o lock_timeout da transação venceu esperando uma trava. */
const ESPERA_VENCIDA = "55P03";

export interface Violacao {
  codigo: string;
  restricao: string;
}

interface NoDaCadeia {
  cause?: unknown;
  code?: unknown;
  constraint?: unknown;
}

/**
 * Procura o erro do node-postgres na cadeia de cause (TRPCError, depois
 * DrizzleQueryError, depois o erro do pg), sem instanceof: o erro pode vir de
 * outra cópia do drizzle-orm.
 */
function naCadeia<T>(erro: unknown, ler: (no: NoDaCadeia) => T | null) {
  let atual: unknown = erro;
  for (let i = 0; atual && i < 5; i += 1) {
    const achado = ler(atual as NoDaCadeia);
    if (achado !== null) {
      return achado;
    }
    atual = (atual as NoDaCadeia).cause;
  }
  return null;
}

export function violacaoDe(erro: unknown): Violacao | null {
  return naCadeia(erro, ({ code, constraint }) =>
    typeof code === "string" &&
    CODIGOS.has(code) &&
    typeof constraint === "string"
      ? { codigo: code, restricao: constraint }
      : null
  );
}

const esperaVencida = (erro: unknown) =>
  naCadeia(erro, ({ code }) => (code === ESPERA_VENCIDA ? true : null)) ??
  false;

/**
 * A recusa do lock_timeout. TOO_MANY_REQUESTS não para o player: ele trata como
 * falha de rede e manda de novo (motivoParadoDe em apps/web).
 */
export const ESPERA_ESGOTADA = {
  code: "TOO_MANY_REQUESTS",
  message: "Outro pedido seu ainda está em andamento. Tente de novo.",
} as const satisfies MensagemDoBanco;

export const CURSO_EM_USO =
  "Este curso já tem aluno (aula assistida, certificado ou liberação). Para tirá-lo do ar, mude o status para Em produção.";

/**
 * Só unique e check que uma escrita do admin dispara com o app funcionando: cada
 * um tem um sentido só, então a frase vale para qualquer procedimento.
 */
export const MENSAGEM_DA_RESTRICAO = {
  curso_codigo_key: {
    code: "CONFLICT",
    message: "Já existe um curso com este código.",
    motivo: "codigo_repetido",
  },
  curso_slug_key: {
    code: "CONFLICT",
    message: "Já existe um curso com este endereço.",
    motivo: "slug_repetido",
  },
  liberacao_curso_ativa_unica: {
    code: "CONFLICT",
    message: "A pessoa já tem este curso liberado.",
  },
  liberacao_troca_nao_revoga: {
    code: "PRECONDITION_FAILED",
    message: "Liberação de troca não se revoga.",
  },
} as const satisfies Record<string, MensagemDoBanco>;

interface MensagemDoBanco {
  code: TRPC_ERROR_CODE_KEY;
  message: string;
  motivo?: Motivo;
}

/**
 * Restrições das tabelas que o admin escreve que não ganham frase. Ou o schema do
 * documento e a regra pura recusam antes (formato, positivo, número único), ou a
 * ordem de gravarCurso as respeita, ou a escrita nunca as viola (cascade, chave
 * gerada). Se uma disparar, é defeito, e o admin vê a mensagem genérica.
 *
 * Uma FK tem um nome só para os dois sentidos: apagar o pai que tem filho e
 * inserir o filho de um pai que sumiu. Por isso nenhuma FK tem frase aqui: quem
 * apaga traduz a própria corrida (apagarCurso devolve CURSO_EM_USO).
 */
export const SEM_MENSAGEM_PROPRIA: ReadonlySet<string> = new Set([
  "aula_assistida_aula_id_aula_id_fkey",
  "aula_duracao_positiva",
  "aula_modulo_id_modulo_id_fkey",
  "aula_pkey",
  "aula_posicao_positiva",
  "aula_posicao_unica",
  "aula_video_completo",
  "aula_video_formato",
  "certificado_curso_id_curso_id_fkey",
  "comunicado_curso_id_curso_id_fkey",
  "comunicado_pkey",
  "curso_capa_alt_preenchido",
  "curso_capa_dimensoes_positivas",
  "curso_pkey",
  "curso_preco_troca_positivo",
  "curso_slug_formato",
  "liberacao_curso_id_curso_id_fkey",
  "liberacao_do_aluno",
  "liberacao_pkey",
  "liberacao_revogacao_coerente",
  "liberacao_troca_pelo_aluno",
  "liberacao_user_id_clerk",
  "modulo_curso_id_curso_id_fkey",
  "modulo_nivel_do_mesmo_curso",
  "modulo_numero_nao_negativo",
  "modulo_numero_unico",
  "modulo_pkey",
  "nivel_curso_id_curso_id_fkey",
  "nivel_ordem_positiva",
  "nivel_pkey",
  "ponto_liberacao_fk",
  "posicao_aula_aula_id_aula_id_fkey",
]);

/**
 * A frase do lock_timeout ou da violação conhecida, que index.ts lança como
 * ErroParaAPessoa. Qualquer outro erro devolve null e sobe como está
 * (INTERNAL_SERVER_ERROR, texto genérico na tela).
 */
export function mensagemDoBanco(erro: unknown): MensagemDoBanco | null {
  if (esperaVencida(erro)) {
    return ESPERA_ESGOTADA;
  }
  const v = violacaoDe(erro);
  if (!(v && Object.hasOwn(MENSAGEM_DA_RESTRICAO, v.restricao))) {
    return null;
  }
  return MENSAGEM_DA_RESTRICAO[
    v.restricao as keyof typeof MENSAGEM_DA_RESTRICAO
  ];
}
