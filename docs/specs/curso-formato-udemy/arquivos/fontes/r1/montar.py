import base64
import pathlib
import sys

aqui = pathlib.Path(sys.argv[1])
publico = pathlib.Path(sys.argv[2])
saida = pathlib.Path(sys.argv[3])


def uri(caminho, tipo):
    return f"data:{tipo};base64," + base64.b64encode(caminho.read_bytes()).decode()


html = (aqui / "fonte.html").read_text()
html = html.replace("__LOCKUP__", uri(publico / "marca/profills-cursos.svg", "image/svg+xml"))
html = html.replace("__CAPA_COMERCIAL__", uri(aqui / "comercial.jpg", "image/jpeg"))
html = html.replace("__CAPA_SEGURANCA__", uri(aqui / "seguranca.jpg", "image/jpeg"))
assert "__" + "LOCKUP" not in html and "__CAPA_" not in html
saida.write_text(html)
print(saida, saida.stat().st_size)
