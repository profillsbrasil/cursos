import { TelaNaoEncontrada } from "@/components/aluno/tela-nao-encontrada";
import { BuscaEmBreve, TopoDoAluno } from "@/components/aluno/topo";

export default function AulaNaoEncontrada() {
  return (
    <>
      <TopoDoAluno esquerda={<BuscaEmBreve />} />
      <TelaNaoEncontrada
        texto="Esta aula não existe ou o curso dela não está liberado para você. Os cursos que você pode fazer estão em Meus cursos."
        titulo="Aula não encontrada"
      />
    </>
  );
}
