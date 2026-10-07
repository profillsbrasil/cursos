// Trava que impede seed e testes de escrever fora do Supabase local.
// O DATABASE_URL do .env aponta para o banco cloud (ver a seção Banco do CLAUDE.md da raiz).

const HOSTS_LOCAIS = new Set(["127.0.0.1", "localhost"]);

const PARAMS_DE_DESTINO = ["host", "hostaddr", "port"];

export const PORTA_LOCAL = "54322";

export const URL_LOCAL_PADRAO = `postgresql://postgres:postgres@127.0.0.1:${PORTA_LOCAL}/postgres`;

export class BancoNaoLocalError extends Error {
  override name = "BancoNaoLocalError";
}

/**
 * Lança se a URL não for do Supabase local. Com `porta` nula, aceita qualquer porta em host local.
 * Devolve host e porta para o chamador imprimir.
 */
export function garantirBancoLocal(
  url: string,
  porta: string | null = PORTA_LOCAL
): { host: string; porta: string } {
  let destino: URL;
  try {
    destino = new URL(url);
  } catch (erro) {
    throw new BancoNaoLocalError(
      "URL de banco inválida. Veja a seção Banco do CLAUDE.md da raiz.",
      { cause: erro }
    );
  }
  // O pg (pg-connection-string) deixa ?host= e &port= da query valerem no lugar dos do URL.
  const sobrescritos = PARAMS_DE_DESTINO.filter((p) =>
    destino.searchParams.has(p)
  );
  if (sobrescritos.length > 0) {
    throw new BancoNaoLocalError(
      `Recusado: a URL troca o destino pela query (${sobrescritos.join(", ")}). Veja a seção Banco do CLAUDE.md da raiz.`
    );
  }
  const host = destino.hostname;
  const portaUrl = destino.port || "5432";
  if (!HOSTS_LOCAIS.has(host)) {
    throw new BancoNaoLocalError(
      `Recusado: ${host}:${portaUrl} não é o Supabase local. Veja a seção Banco do CLAUDE.md da raiz.`
    );
  }
  if (porta !== null && portaUrl !== porta) {
    throw new BancoNaoLocalError(
      `Recusado: a porta ${portaUrl} não é a do Supabase local (${porta}). Veja a seção Banco do CLAUDE.md da raiz.`
    );
  }
  return { host, porta: portaUrl };
}

/** URL do banco de teste, ou null quando TEST_DATABASE_URL não está definida. Lança se não for local. */
export function urlDeTeste(): string | null {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    return null;
  }
  garantirBancoLocal(url, null);
  return url;
}
