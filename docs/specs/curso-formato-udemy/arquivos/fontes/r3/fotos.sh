#!/bin/sh
# Monta o HTML e tira as fotos no Chromium headless: janela, página inteira, 390 px e os três estados.
D=$(dirname "$(readlink -f "$0")")
REPO=$(git -C "$D" rev-parse --show-toplevel)
SAIDA=$REPO/docs/specs/curso-formato-udemy/arquivos/prototipo-editor-r3.html
F=${1:-$D/fotos}
mkdir -p "$F"
[ -f "$D/seguranca.jpg" ] || touch "$D/seguranca.jpg"
python3 -I "$D/montar.py" "$D" "$REPO/apps/web/public" "$SAIDA" >/dev/null || exit 1
foto() {
  NOME=$1 LARGURA=$2 ALTURA=$3 CLIQUE=$4
  P=$D/foto-$NOME.html
  { echo '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"></head><body>'; cat "$SAIDA"; echo "<script>setTimeout(()=>{${CLIQUE}},300)</script></body></html>"; } > "$P"
  chromium --headless=new --disable-gpu --hide-scrollbars --virtual-time-budget=5000 --window-size="$LARGURA,$ALTURA" --screenshot="$F/$NOME.png" "file://$P" 2>/dev/null
  magick "$F/$NOME.png" -fuzz 1% -trim +repage "$F/$NOME.png"
  rm -f "$P"
  echo "$NOME.png $(magick identify -format '%wx%h' "$F/$NOME.png")"
}
foto janela 1600 1100 ""
foto inteira 1600 6000 'document.querySelector(".alternar").click()'
foto celular 390 2400 ""
foto estado-vazio 1600 1100 'document.querySelector("[data-estado=vazio]").click()'
foto estado-erro 1600 1100 'document.querySelector("[data-estado=erro]").click()'
foto estado-salvo 1600 1100 'document.querySelector("[data-salvar]").click()'
