"use client";

import { TelaDeErro } from "@/components/casca/tela-de-erro";

export default function ErroDaMinhaConta(props: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <TelaDeErro {...props} titulo="Não deu para abrir Minha conta" />;
}
