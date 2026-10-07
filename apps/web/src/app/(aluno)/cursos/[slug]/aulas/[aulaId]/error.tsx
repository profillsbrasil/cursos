"use client";

import { TelaDeErro } from "@/components/aluno/tela-de-erro";
import { BuscaEmBreve, TopoDoAluno } from "@/components/aluno/topo";

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
