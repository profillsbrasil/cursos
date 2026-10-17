import { TelaNaoEncontrada } from "@/components/aluno/tela-nao-encontrada";

export default function AulaNaoEncontrada() {
  return (
    <TelaNaoEncontrada
      texto="Esta aula não existe ou o curso dela não está liberado para você. Os cursos que você pode fazer estão em Meus cursos."
      titulo="Aula não encontrada"
    />
  );
}
