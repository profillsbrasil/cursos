import type { Versao } from "@cursos/api/dominio/tipos";

/** O elemento novo ou movido só está no DOM depois que o React aplica a mudança. */
export const focarDepois = (id: string) =>
  requestAnimationFrame(() => document.getElementById(id)?.focus());

export type Direcao = "acima" | "abaixo";

export function trocado<T>(
  lista: readonly T[],
  i: number,
  direcao: Direcao
): T[] | null {
  const j = direcao === "acima" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= lista.length) {
    return null;
  }
  const nova = [...lista];
  [nova[i], nova[j]] = [nova[j] as T, nova[i] as T];
  return nova;
}

/** A seta da borda desabilita e perderia o foco. */
export const setaDepoisDeMover = (
  direcao: Direcao,
  chegouNaBorda: boolean
): Direcao => {
  if (!chegouNaBorda) {
    return direcao;
  }
  return direcao === "acima" ? "abaixo" : "acima";
};

interface NaPagina<T> {
  compareDocumentPosition: (outro: T) => number;
}

/** Node.DOCUMENT_POSITION_PRECEDING, sem depender do DOM no teste. */
const VEM_ANTES = 2;

export function primeiroNaPagina<T extends NaPagina<T>>(
  elementos: readonly T[]
): T | undefined {
  return elementos.reduce<T | undefined>(
    (primeiro, e) =>
      primeiro === undefined ||
      // biome-ignore lint/suspicious/noBitwiseOperators: o DOM devolve a posição como máscara de bits.
      (primeiro.compareDocumentPosition(e) & VEM_ANTES) !== 0
        ? e
        : primeiro,
    undefined
  );
}

export function focarOPrimeiro(ids: readonly string[]) {
  const elementos = ids.flatMap((id) => {
    const e = document.getElementById(id);
    return e ? [e] : [];
  });
  primeiroNaPagina(elementos)?.focus();
}

export const novoId = <T extends string>() => crypto.randomUUID() as T;

interface ComVersao {
  versao: Versao | null;
}

export interface Apoio<D extends ComVersao> {
  /** O documento em que o rascunho se apoia; o próximo salvar manda a versão dele. */
  base: D;
  /** O último documento que a página entregou. */
  pagina: D;
  versaoDeFora: boolean;
}

export const apoioEm = <D extends ComVersao>(pagina: D): Apoio<D> => ({
  base: pagina,
  pagina,
  versaoDeFora: false,
});

export const apoioSalvo = <D extends ComVersao>(
  apoio: Apoio<D>,
  salvo: D
): Apoio<D> => ({ ...apoio, base: salvo, versaoDeFora: false });

export interface Sincronia<D extends ComVersao> {
  apoio: Apoio<D>;
  /** O editor joga fora o rascunho e recomeça de `apoio.base`. */
  recomecar: boolean;
}

/**
 * O refresh do próprio salvar traz a versão que já é a da base; versão de fora
 * com o rascunho sujo fica para o Recarregar, porque o próximo salvar seria
 * recusado com versao_mudou. A versão é o hash do conteúdo: a página que volta
 * à versão da base desliga o aviso.
 */
export function sincronizarComAPagina<D extends ComVersao>(
  apoio: Apoio<D>,
  { limpo, pagina }: { limpo: boolean; pagina: D }
): Sincronia<D> {
  if (pagina.versao === apoio.base.versao) {
    return {
      apoio: { ...apoio, pagina, versaoDeFora: false },
      recomecar: false,
    };
  }
  if (limpo) {
    return { apoio: apoioEm(pagina), recomecar: true };
  }
  return { apoio: { ...apoio, pagina, versaoDeFora: true }, recomecar: false };
}
