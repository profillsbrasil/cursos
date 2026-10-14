#!/usr/bin/env bash
# Gera favicon.ico, apple-icon.png e os dois ícones do PWA a partir dos SVG da marca.
# Uso, da raiz do repo: bash docs/marca/rasters.sh apps/web
set -euo pipefail
web=$1
pena=$web/src/app/icon.svg
icone=$web/public/marca/profills-cursos-icone.svg
tmp=$(mktemp -d)
trap 'rm -rf -- "${tmp:?}"' EXIT

# Favicon: a pena sozinha, fundo transparente, em 16, 32 e 48.
for n in 16 32 48; do
  rsvg-convert -w "$n" -h "$n" "$pena" -o "$tmp/pena-$n.png"
done
magick "$tmp/pena-16.png" "$tmp/pena-32.png" "$tmp/pena-48.png" "$web/src/app/favicon.ico"

# Ícone completo (livro e pena) sobre #1A1D22, com a mesma margem dos PNG anteriores:
# o quadro de 216 do SVG ocupa <lado> px, centrado na tela de <tela> px.
quadro() {
  local tela=$1 lado=$2 saida=$3
  rsvg-convert -w "$lado" -h "$lado" "$icone" -o "$tmp/icone-$lado.png"
  magick -size "${tela}x${tela}" xc:'#1A1D22' "$tmp/icone-$lado.png" -gravity center -composite \
    -colors 256 -strip "PNG8:$saida"
}
quadro 180 136 "$web/src/app/apple-icon.png"
quadro 192 138 "$web/public/favicon/web-app-manifest-192x192.png"
quadro 512 368 "$web/public/favicon/web-app-manifest-512x512.png"
