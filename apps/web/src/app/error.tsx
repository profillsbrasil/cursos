"use client";

import { TelaDeErro } from "@/components/casca/tela-de-erro";

// Erro de layout (o do aluno lê o resumo do banco): sem este arquivo, o Next mostra a tela padrão em inglês.
export default function ErroDoApp(props: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <main className="px-[clamp(1rem,4vw,3rem)] pt-8 pb-16">
      <TelaDeErro {...props} titulo="Não deu para abrir esta página" />
    </main>
  );
}
