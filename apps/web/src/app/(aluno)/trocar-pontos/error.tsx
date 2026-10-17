"use client";

import { TelaDeErro } from "@/components/casca/tela-de-erro";

export default function ErroDaTroca(props: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <TelaDeErro {...props} titulo="Não deu para carregar a troca de pontos" />
  );
}
