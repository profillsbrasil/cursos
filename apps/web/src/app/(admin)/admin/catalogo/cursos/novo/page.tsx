import { redirect } from "next/navigation";

import { rota } from "@/lib/rotas";
import { exigirAdmin } from "@/server/api";

export default async function NovoCurso() {
  await exigirAdmin();
  redirect(rota(`/admin/catalogo/cursos/${crypto.randomUUID()}?novo=1`));
}
