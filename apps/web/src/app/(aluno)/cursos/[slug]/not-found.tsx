import type { Metadata } from "next";

import { TelaNaoEncontrada } from "@/components/aluno/tela-nao-encontrada";

const TITULO = "Curso não encontrado";

// Vale porque o generateMetadata da página do curso e o do certificado também
// chamam notFound().
export const metadata: Metadata = { title: TITULO };

// notFound() da página do curso e do certificado: fica dentro da sidebar, em pt-BR.
export default function CursoNaoEncontrado() {
  return (
    <TelaNaoEncontrada
      texto="Este curso não está liberado para você ou ainda não abriu. Os cursos que você pode fazer estão em Meus cursos."
      titulo={TITULO}
    />
  );
}
