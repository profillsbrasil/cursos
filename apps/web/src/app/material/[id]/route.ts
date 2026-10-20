import { respostaDoMaterial } from "@/components/material-de-apoio/resposta-do-material";
import { abrirMaterial } from "@/server/api";

/** O material de apoio, para o admin e para quem a página do curso abre. */
export async function GET(
  _req: Request,
  { params }: RouteContext<"/material/[id]">
) {
  return respostaDoMaterial(await abrirMaterial((await params).id));
}
