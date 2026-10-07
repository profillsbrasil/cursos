"use client";

import { TelaDeErro } from "@/components/aluno/tela-de-erro";
import { BuscaEmBreve, TopoDoAluno } from "@/components/aluno/topo";

// No Next 16.3 a função de recuperação do error.js se chama retry (antes, reset).
export default function ErroDaTroca(props: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <>
      <TopoDoAluno esquerda={<BuscaEmBreve />} />
      <TelaDeErro {...props} titulo="Não deu para carregar a troca de pontos" />
    </>
  );
}
