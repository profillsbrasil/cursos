// O cabeçalho do download do material de apoio. O filename* leva o nome original
// em UTF-8 (RFC 6266 e 5987); o filename simples é a reserva em ASCII para quem
// não lê o outro, sem aspas nem barra que quebrariam o cabeçalho.

const FORA_DO_ASCII = /[^\x20-\x7e]/g;
const QUEBRAM_O_CABECALHO = /["\\]/g;
const ACENTOS = /\p{Diacritic}/gu;

/** encodeURIComponent deixa passar ' ( ) *, que o RFC 5987 não aceita no valor. */
const emPercentual = (nome: string) =>
  encodeURIComponent(nome).replace(
    /['()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );

export function disposicaoDoAnexo(nome: string): string {
  const ascii = nome
    .normalize("NFD")
    .replace(ACENTOS, "")
    .replace(FORA_DO_ASCII, "_")
    .replace(QUEBRAM_O_CABECALHO, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${emPercentual(nome)}`;
}
