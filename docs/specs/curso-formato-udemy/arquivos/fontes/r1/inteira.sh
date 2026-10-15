#!/bin/sh
# Monta, abre tudo em Página inteira numa janela de 2700 px (escala perto de 1) e recorta cada versão em inteira-<n>.png.
D=$(dirname "$(readlink -f "$0")")
sh "$D/fotos.sh" >/dev/null || exit 1
sed 's#<div class="doc">#<style>.doc{max-width:none!important}</style><div class="doc">#' "$D/pagina.html" \
  | sed 's#</body>#<script>document.querySelectorAll(".alternar").forEach(b=>b.click());setTimeout(()=>{document.body.dataset.caixas=[...document.querySelectorAll(".escala")].map(e=>{const b=e.getBoundingClientRect();return [Math.round(b.width),Math.round(b.height),Math.round(b.left),Math.round(b.top+scrollY)].join(",")}).join(";")},300)</script></body>#' > "$D/inteira.html"
CAIXAS=$(chromium --headless=new --disable-gpu --hide-scrollbars --virtual-time-budget=5000 --window-size=2700,16000 --dump-dom "file://$D/inteira.html" 2>/dev/null | grep -o 'data-caixas="[^"]*' | cut -d'"' -f2)
chromium --headless=new --disable-gpu --hide-scrollbars --virtual-time-budget=5000 --window-size=2700,16000 --screenshot="$D/inteira.png" "file://$D/inteira.html" 2>/dev/null
i=0
echo "$CAIXAS" | tr ';' '\n' | while IFS=, read -r w h x y; do
  i=$((i + 1))
  magick "$D/inteira.png" -crop "${w}x${h}+${x}+${y}" +repage "$D/inteira-$i.png"
  echo "inteira-$i.png ${w}x${h}"
done
