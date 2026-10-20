"use client";

import {
  FALHA_SEM_LOGIN,
  PaginaPublica,
} from "@/components/casca/pagina-publica";
import { TelaDeErro } from "@/components/casca/tela-de-erro";

// Erro de layout (o do aluno lê o resumo do banco): sem este arquivo, o Next mostra a tela padrão em inglês.
export default function ErroDoApp(props: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <PaginaPublica>
      <div className="w-full max-w-[520px]">
        <TelaDeErro
          {...props}
          texto={FALHA_SEM_LOGIN}
          titulo="Não deu para abrir esta página"
        />
      </div>
    </PaginaPublica>
  );
}
