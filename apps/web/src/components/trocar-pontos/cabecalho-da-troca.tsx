import { CabecalhoDaPagina } from "@/components/casca/cabecalho-da-pagina";

/** O mesmo topo na página e no esqueleto: a frase é fixa, então o esqueleto já a mostra. */
export function CabecalhoDaTroca() {
  return (
    <CabecalhoDaPagina
      resumo="Troque seus pontos por cursos liberados para sempre."
      titulo="Trocar pontos"
    />
  );
}
