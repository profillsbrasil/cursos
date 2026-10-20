import type { Metadata } from "next";

import { TelaNaoEncontrada } from "@/components/aluno/tela-nao-encontrada";

const TITULO = "Página não encontrada";

export const metadata: Metadata = { title: TITULO };

// Endereço que não existe no app.
export default function PaginaNaoEncontrada() {
  return (
    <main className="px-[clamp(1rem,4vw,3rem)] pt-8 pb-16">
      <TelaNaoEncontrada
        texto="O endereço não existe ou mudou. Seus cursos continuam em Meus cursos."
        titulo={TITULO}
      />
    </main>
  );
}
