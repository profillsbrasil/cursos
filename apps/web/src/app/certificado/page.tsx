import { redirect } from "next/navigation";

import { SemCertificado } from "@/components/certificado/conferencia";
import { caminhoDaConferencia } from "@/lib/rotas";

export default async function Conferir({
  searchParams,
}: {
  searchParams: Promise<{ codigo?: string | string[] }>;
}) {
  const { codigo } = await searchParams;
  const digitado = typeof codigo === "string" ? codigo.trim().slice(0, 40) : "";
  if (digitado) {
    redirect(caminhoDaConferencia(encodeURIComponent(digitado)));
  }
  return <SemCertificado digitado={null} />;
}
