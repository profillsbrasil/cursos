import type { Metadata } from "next";

import { TelaNaoEncontrada } from "@/components/aluno/tela-nao-encontrada";

const TITULO = "Aula não encontrada";

// Vale porque o generateMetadata da página também chama notFound().
export const metadata: Metadata = { title: TITULO };

export default function AulaNaoEncontrada() {
  return (
    <TelaNaoEncontrada
      texto="Esta aula não existe ou o curso dela não está liberado para você. Os cursos que você pode fazer estão em Meus cursos."
      titulo={TITULO}
    />
  );
}
