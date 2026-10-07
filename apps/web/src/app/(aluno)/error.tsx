"use client";

import { TelaDeErro } from "@/components/aluno/tela-de-erro";

// Erro das páginas do aluno, dentro da sidebar. Erro do próprio layout cai no app/error.tsx.
// No Next 16.3 a função de recuperação do error.js se chama retry (antes, reset).
export default function ErroDoAluno(props: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <TelaDeErro {...props} titulo="Não deu para carregar seus cursos" />;
}
