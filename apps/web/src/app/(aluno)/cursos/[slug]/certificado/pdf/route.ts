import { rotaDoPdfDoAluno } from "@/components/certificado/resposta-do-pdf";
import { carregarPaginaDoCertificado } from "@/server/api";

export const GET = rotaDoPdfDoAluno(carregarPaginaDoCertificado);
