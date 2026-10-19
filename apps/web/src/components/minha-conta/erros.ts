import {
  isClerkAPIResponseError,
  isReverificationCancelledError,
} from "@clerk/nextjs/errors";

import { FRASES_DO_NOME } from "./nome";

const CANCELADA = "Você não confirmou quem é, então nada mudou.";
const MUITAS_TENTATIVAS =
  "Muitas tentativas seguidas. Espere um minuto e tente de novo.";

export const FRASE_GENERICA =
  "Não deu para salvar. Tente de novo em instantes.";

/** O código do erro do Clerk (`errors[0].code`) e a frase que a pessoa lê. */
export const FRASES_DO_CLERK: Record<string, string> = {
  avatar_file_size_exceeded: "A foto passa de 10 MB. Escolha uma menor.",
  avatar_file_type_invalid: "Use uma foto em JPG, PNG, GIF ou WebP.",
  form_code_incorrect: "Código errado. Confira o e-mail e digite de novo.",
  form_identifier_exists: "Este e-mail já está em outra conta.",
  form_new_password_matches_current:
    "A senha nova é igual à atual. Escolha outra.",
  form_param_format_invalid: "Confira o e-mail: ele parece incompleto.",
  form_password_compromised:
    "Esta senha apareceu num vazamento de dados. Escolha outra.",
  form_password_incorrect: "A senha atual está errada.",
  form_password_length_too_short: "A senha precisa de 15 caracteres ou mais.",
  form_password_not_strong_enough:
    "Esta senha é fácil de adivinhar. Use uma frase mais longa.",
  form_password_pwned:
    "Esta senha apareceu num vazamento de dados. Escolha outra.",
  form_password_validation_failed: "A senha atual está errada.",
  identification_deletion_failed:
    "Este é o único jeito de entrar na conta, e ele fica.",
  reverification_cancelled: CANCELADA,
  too_many_requests: MUITAS_TENTATIVAS,
  verification_expired: "O código venceu. Peça outro.",
  verification_failed:
    "Muitas tentativas com o código errado. Peça outro código.",
};

const CAMPOS_DO_NOME = new Set(["first_name", "last_name"]);

/** A recusa do nome pelo Clerk: tag de HTML, endereço de site ou outra regra dele. */
function fraseDoNomeRecusado(longMessage = "") {
  if (longMessage.includes("HTML")) {
    return FRASES_DO_NOME.sinais;
  }
  if (longMessage.includes("URL")) {
    return FRASES_DO_NOME.site;
  }
  return FRASES_DO_NOME.recusado;
}

/** A frase em pt-BR de um erro do Clerk, ou a genérica. */
export function fraseDoErro(e: unknown): string {
  if (isReverificationCancelledError(e)) {
    return CANCELADA;
  }
  if (!isClerkAPIResponseError(e)) {
    return FRASE_GENERICA;
  }
  const [erro] = e.errors;
  const codigo = erro?.code ?? "";
  if (
    codigo === "form_param_value_invalid" &&
    CAMPOS_DO_NOME.has(erro?.meta?.paramName ?? "")
  ) {
    return fraseDoNomeRecusado(erro?.longMessage);
  }
  const frase = FRASES_DO_CLERK[codigo];
  if (frase) {
    return frase;
  }
  if (e.status === 429) {
    return MUITAS_TENTATIVAS;
  }
  return FRASE_GENERICA;
}
