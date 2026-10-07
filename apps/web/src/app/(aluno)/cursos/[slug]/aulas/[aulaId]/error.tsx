"use client";

import { TelaDeErro } from "@/components/aluno/tela-de-erro";
import { BuscaEmBreve, TopoDoAluno } from "@/components/aluno/topo";

// Erro da página da aula. No Next 16.3 a função de recuperação se chama retry.
export default function ErroDaAula(props: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <>
      <TopoDoAluno esquerda={<BuscaEmBreve />} />
      <TelaDeErro {...props} titulo="Não deu para abrir esta aula" />
    </>
  );
}
