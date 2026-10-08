"use client";

import { TelaDeErro } from "@/components/aluno/tela-de-erro";

// Erro das páginas do admin, dentro da sidebar. Erro do próprio layout cai no app/error.tsx.
export default function ErroDoAdmin(props: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <TelaDeErro
      {...props}
      texto="A conexão com o servidor falhou. Tente de novo em instantes."
      titulo="Não deu para carregar a área do admin"
    />
  );
}
