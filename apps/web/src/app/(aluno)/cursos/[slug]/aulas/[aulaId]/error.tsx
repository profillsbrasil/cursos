"use client";

import { BuscaEmBreve, TopoDoAluno } from "@/components/aluno/topo";
import { TelaDeErro } from "@/components/casca/tela-de-erro";

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
