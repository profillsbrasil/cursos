#!/bin/sh
# Monta, abre cada versão na janela de 860 px (janela-<n>.png) e em Página inteira (inteira-<n>.png), numa página de 2700 px de largura.
D=$(dirname "$(readlink -f "$0")")
sh "$D/fotos.sh" >/dev/null || exit 1
recortar() {
  MODO=$1
  CLIQUE=""
  [ "$MODO" = inteira ] && CLIQUE='document.querySelectorAll(".alternar").forEach(b=>b.click());'
  sed 's#<div class="doc">#<style>.doc{max-width:none!important}</style><div class="doc">#' "$D/pagina.html" \
    | sed "s#</body>#<script>${CLIQUE}setTimeout(()=>{document.body.dataset.caixas=[...document.querySelectorAll('.escala')].map(e=>{const b=e.getBoundingClientRect();return [Math.round(b.width),Math.round(b.height),Math.round(b.left),Math.round(b.top+scrollY)].join(',')}).join(';')},300)</script></body>#" > "$D/$MODO.html"
  CAIXAS=$(chromium --headless=new --disable-gpu --hide-scrollbars --virtual-time-budget=5000 --window-size=2700,16000 --dump-dom "file://$D/$MODO.html" 2>/dev/null | grep -o 'data-caixas="[^"]*' | cut -d'"' -f2)
  chromium --headless=new --disable-gpu --hide-scrollbars --virtual-time-budget=5000 --window-size=2700,16000 --screenshot="$D/$MODO.png" "file://$D/$MODO.html" 2>/dev/null
  i=0
  echo "$CAIXAS" | tr ';' '\n' | while IFS=, read -r w h x y; do
    i=$((i + 1))
    magick "$D/$MODO.png" -crop "${w}x${h}+${x}+${y}" +repage "$D/$MODO-$i.png"
    echo "$MODO-$i.png ${w}x${h}"
  done
}
recortar janela
recortar inteira
