#!/bin/sh
# Monta o HTML, roda interacao.js no Chromium headless e imprime o resultado de cada passo.
D=$(dirname "$(readlink -f "$0")")
REPO=$(git -C "$D" rev-parse --show-toplevel)
SAIDA=$REPO/docs/specs/curso-formato-udemy/arquivos/prototipo-editor-r3.html
[ -f "$D/seguranca.jpg" ] || touch "$D/seguranca.jpg"
python3 -I "$D/montar.py" "$D" "$REPO/apps/web/public" "$SAIDA" >/dev/null || exit 1
P=$D/interacao.html
{ echo '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"></head><body>'; cat "$SAIDA"; echo "<script>$(cat "$D/interacao.js")</script></body></html>"; } > "$P"
chromium --headless=new --disable-gpu --hide-scrollbars --virtual-time-budget=5000 --window-size=1600,1200 --dump-dom "file://$P" 2>/dev/null \
  | grep -o "data-r=\"[^\"]*" | cut -d'"' -f2 | sed 's/&quot;/"/g; s/&amp;/\&/g' | python3 -I -m json.tool
