const FORA_DO_ASCII = /[^\x20-\x7E]/g;
const QUEBRAM_O_CABECALHO = /["\\]/g;
const ACENTOS = /\p{Diacritic}/gu;

const emPercentualDoRfc5987 = (nome: string) =>
  encodeURIComponent(nome).replace(
    /['()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );

/**
 * O cabeçalho do download do material de apoio. O filename* leva o nome original
 * em UTF-8 (RFC 6266 e 5987); o filename simples é a reserva em ASCII para quem
 * não lê o outro, sem aspas nem barra que quebrariam o cabeçalho.
 */
export function disposicaoDoAnexo(nome: string): string {
  const ascii = nome
    .normalize("NFD")
    .replace(ACENTOS, "")
    .replace(FORA_DO_ASCII, "_")
    .replace(QUEBRAM_O_CABECALHO, "_");

  return `attachment; filename="${ascii}"; filename*=UTF-8''${emPercentualDoRfc5987(nome)}`;
}
