import { TelaNaoEncontrada } from "@/components/aluno/tela-nao-encontrada";

// notFound() da página do curso: fica dentro da sidebar, em pt-BR.
export default function CursoNaoEncontrado() {
  return (
    <TelaNaoEncontrada
      texto="Este curso não está liberado para você ou ainda não abriu. Os cursos que você pode fazer estão em Meus cursos."
      titulo="Curso não encontrado"
    />
  );
}
