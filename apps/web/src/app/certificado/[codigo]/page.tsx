import { codigoDigitado } from "@cursos/api/dominio/conferencia";
import { diaLocal } from "@cursos/api/dominio/sequencia";
import { redirect } from "next/navigation";

import {
  ReciboDaConferencia,
  SemCertificado,
} from "@/components/certificado/conferencia";
import { caminhoDaConferencia } from "@/lib/rotas";
import { conferirCertificado } from "@/server/api";

interface Props {
  params: Promise<{ codigo: string }>;
}

function lerSegmento(segmento: string) {
  try {
    return decodeURIComponent(segmento);
  } catch {
    return segmento;
  }
}

export default async function Conferencia({ params }: Props) {
  const digitado = lerSegmento((await params).codigo).slice(0, 40);
  const codigo = codigoDigitado(digitado);
  if (codigo && codigo !== digitado) {
    redirect(caminhoDaConferencia(codigo));
  }
  const certificado = codigo && (await conferirCertificado(codigo));
  return certificado ? (
    <ReciboDaConferencia
      certificado={certificado}
      hoje={diaLocal(new Date())}
    />
  ) : (
    <SemCertificado digitado={digitado} />
  );
}
