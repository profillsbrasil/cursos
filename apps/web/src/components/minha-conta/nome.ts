/**
 * As regras do nome que a pessoa salva em Minha conta, conferidas antes de ir ao
 * Clerk. O Clerk recusa o nome com tag ou entidade de HTML ("<b>", "</x>", "&amp;")
 * e com endereço de site ("https://x.com"), com o código `form_param_value_invalid`;
 * aceita emoji, número, hífen e "<" solto ("<3"). Aqui a regra é mais simples de
 * dizer: nada de <, > e &, nem "://".
 *
 * Os limites mantêm o nome legível na folha do certificado; quem garante que qualquer
 * nome cabe é a própria folha (`nomeNaFolha`, em `certificado/medidas-da-folha.ts`),
 * que desce o corpo em degraus e corta com reticências. O Clerk aceita até 256 por campo.
 */

export const LIMITE_DO_NOME = 100;
export const LIMITE_DA_PALAVRA = 20;

export type CampoDoNome = "nome" | "sobrenome";

export interface ProblemaDoNome {
  campos: CampoDoNome[];
  frase: string;
}

export const FRASES_DO_NOME = {
  comprimento: `O nome e o sobrenome juntos vão até ${LIMITE_DO_NOME} caracteres, para caber no certificado.`,
  palavra: `Cada palavra do nome vai até ${LIMITE_DA_PALAVRA} letras, para caber na linha do certificado.`,
  recusado: "Este nome não foi aceito. Use letras, espaço, hífen e apóstrofo.",
  sinais: "O nome não pode ter os sinais <, > e &.",
  site: "O nome não pode ter endereço de site.",
  vazio: "Escreva o seu nome para salvar.",
} as const;

const SINAIS = /[<>&]/;
const SITE = /[a-z][\w+.-]*:\/\//i;
const ESPACO = /\s+/;

const temPalavraLonga = (texto: string) =>
  texto.split(ESPACO).some((p) => [...p].length > LIMITE_DA_PALAVRA);

function comProblema(
  campos: Record<CampoDoNome, string>,
  regra: (texto: string) => boolean
): CampoDoNome[] {
  return (Object.keys(campos) as CampoDoNome[]).filter((c) => regra(campos[c]));
}

/** O primeiro problema do nome digitado, com os campos onde ele está, ou `null`. */
export function problemaDoNome(
  nome: string,
  sobrenome: string
): ProblemaDoNome | null {
  const campos = { nome, sobrenome };
  if (nome.trim() === "") {
    return { campos: ["nome"], frase: FRASES_DO_NOME.vazio };
  }
  const sinais = comProblema(campos, (t) => SINAIS.test(t));
  if (sinais.length > 0) {
    return { campos: sinais, frase: FRASES_DO_NOME.sinais };
  }
  const site = comProblema(campos, (t) => SITE.test(t));
  if (site.length > 0) {
    return { campos: site, frase: FRASES_DO_NOME.site };
  }
  const longas = comProblema(campos, temPalavraLonga);
  if (longas.length > 0) {
    return { campos: longas, frase: FRASES_DO_NOME.palavra };
  }
  const completo = `${nome.trim()} ${sobrenome.trim()}`.trim();
  if ([...completo].length > LIMITE_DO_NOME) {
    return { campos: ["nome", "sobrenome"], frase: FRASES_DO_NOME.comprimento };
  }
  return null;
}
