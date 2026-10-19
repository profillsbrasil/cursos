/**
 * As regras do nome que a pessoa salva em Minha conta, conferidas antes de ir ao
 * Clerk. O Clerk recusa o nome com tag ou entidade de HTML ("<b>", "</x>", "&amp;")
 * e com endereço de site ("https://x.com"), com o código `form_param_value_invalid`;
 * aceita emoji, número, hífen e "<" solto ("<3"). Aqui a regra é mais simples de
 * dizer: nada de <, > e &, nem "://".
 */

export type CampoDoNome = "nome" | "sobrenome";

export interface ProblemaDoNome {
  campos: CampoDoNome[];
  frase: string;
}

export const FRASES_DO_NOME = {
  recusado: "Este nome não foi aceito. Use letras, espaço, hífen e apóstrofo.",
  sinais: "O nome não pode ter os sinais <, > e &.",
  site: "O nome não pode ter endereço de site.",
} as const;

const SINAIS = /[<>&]/;
const SITE = /[a-z][\w+.-]*:\/\//i;

function comProblema(
  campos: Record<CampoDoNome, string>,
  regra: RegExp
): CampoDoNome[] {
  return (Object.keys(campos) as CampoDoNome[]).filter((c) =>
    regra.test(campos[c])
  );
}

/** O primeiro problema do nome digitado, com os campos onde ele está, ou `null`. */
export function problemaDoNome(
  nome: string,
  sobrenome: string
): ProblemaDoNome | null {
  const campos = { nome, sobrenome };
  const sinais = comProblema(campos, SINAIS);
  if (sinais.length > 0) {
    return { campos: sinais, frase: FRASES_DO_NOME.sinais };
  }
  const site = comProblema(campos, SITE);
  if (site.length > 0) {
    return { campos: site, frase: FRASES_DO_NOME.site };
  }
  return null;
}
