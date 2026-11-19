import { rotaDoPdfDaConferencia } from "@/components/certificado/resposta-do-pdf";
import { conferirCertificado } from "@/server/api";

export const GET = rotaDoPdfDaConferencia(conferirCertificado);
