#!/bin/sh
# Monta o HTML e tira as fotos no Chromium headless: página em 1600 px e em 390 px.
D=$(dirname "$(readlink -f "$0")")
SAIDA=docs/specs/curso-formato-udemy/arquivos/prototipos-curso-r2.html
python3 -I "$D/montar.py" "$D" /home/othavio/.herdr/worktrees/cursos/curso-formato-udemy/apps/web/public "$SAIDA" || exit 1
P=$D/pagina.html
{ echo '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"></head><body>'; cat "$SAIDA"; echo '</body></html>'; } > "$P"
chromium --headless=new --disable-gpu --hide-scrollbars --virtual-time-budget=4000 --window-size=1600,7400 --screenshot="$D/desktop.png" "file://$P" 2>/dev/null
chromium --headless=new --disable-gpu --hide-scrollbars --virtual-time-budget=4000 --window-size=390,5200 --screenshot="$D/celular.png" "file://$P" 2>/dev/null
ls -la "$D"/desktop.png "$D"/celular.png
