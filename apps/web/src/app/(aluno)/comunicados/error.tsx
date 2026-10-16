"use client";

import { BuscaEmBreve, TopoDoAluno } from "@/components/aluno/topo";
import { TelaDeErro } from "@/components/casca/tela-de-erro";

export default function ErroDosComunicados(props: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <>
      <TopoDoAluno esquerda={<BuscaEmBreve />} />
      <TelaDeErro {...props} titulo="Não deu para carregar os comunicados" />
    </>
  );
}
