import { TelaNaoEncontrada } from "@/components/aluno/tela-nao-encontrada";

// Endereço que não existe no app.
export default function PaginaNaoEncontrada() {
  return (
    <main className="px-[clamp(1rem,4vw,3rem)] pt-8 pb-16">
      <TelaNaoEncontrada
        texto="O endereço não existe ou mudou. Seus cursos continuam em Meus cursos."
        titulo="Página não encontrada"
      />
    </main>
  );
}
