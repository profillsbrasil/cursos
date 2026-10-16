import type { CertificadoEmitido } from "@cursos/api/dominio/pagina-do-certificado";

import { comNome, enderecoDaConferencia, folhaDo } from "./folha";
import { pdfDaFolha } from "./pdf";

export async function respostaDoPdf(
  certificado: CertificadoEmitido | null,
  origem: string
): Promise<Response> {
  const comONome = comNome(certificado);
  if (!comONome) {
    return new Response("Certificado não encontrado.", { status: 404 });
  }
  const pdf = await pdfDaFolha(
    folhaDo(comONome, enderecoDaConferencia(origem, comONome.codigo))
  );
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="certificado-${comONome.codigo}.pdf"`,
      "Content-Type": "application/pdf",
    },
  });
}
