"use client";

import { FALHA_SEM_LOGIN } from "@/components/casca/pagina-publica";
import { TelaDeErro } from "@/components/casca/tela-de-erro";

// Dentro do layout da conferência, então o visitante continua vendo a faixa com a marca.
export default function ErroDaConferencia(props: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <div className="w-full max-w-[520px]">
      <TelaDeErro
        {...props}
        texto={FALHA_SEM_LOGIN}
        titulo="Não deu para conferir o certificado"
      />
    </div>
  );
}
