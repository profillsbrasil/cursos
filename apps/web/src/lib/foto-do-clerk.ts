/**
 * O img.clerk.com serve a foto em 1000 x 1000 e reduz pela query `width`. Pede o
 * dobro do lado em que ela aparece, para a tela de densidade 2. Só a largura: ele
 * arredonda a largura para a faixa dele (80, 160, 200...) e não a altura, e com as
 * duas a foto sairia mais larga que alta.
 */
export function fotoNoLado(url: string, lado: number): string {
  const foto = new URL(url);
  if (foto.hostname !== "img.clerk.com") {
    return url;
  }
  foto.searchParams.set("width", String(lado * 2));
  return foto.toString();
}
