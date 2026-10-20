import type { Metadata } from "next";

import { TelaNaoEncontrada } from "@/components/aluno/tela-nao-encontrada";
import { PaginaPublica } from "@/components/casca/pagina-publica";

const TITULO = "Página não encontrada";

export const metadata: Metadata = { title: TITULO };

// Endereço que não existe no app, aberto por quem entrou ou não: fora da casca,
// com a marca, e o texto não supõe login.
export default function PaginaNaoEncontrada() {
  return (
    <PaginaPublica>
      <div className="w-full max-w-[520px]">
        <TelaNaoEncontrada
          acao="Ir para Meus cursos"
          texto="O endereço não existe ou mudou. Confira o link que você recebeu."
          titulo={TITULO}
        />
      </div>
    </PaginaPublica>
  );
}
