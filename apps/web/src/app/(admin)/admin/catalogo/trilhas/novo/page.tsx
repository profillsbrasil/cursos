import type { TrilhaId } from "@cursos/api/dominio/tipos";
import type { Route } from "next";
import { redirect } from "next/navigation";

import { novoId } from "@/lib/editor";
import { exigirAdmin } from "@/server/api";

/**
 * O id da trilha nova nasce aqui, uma vez: recarregar o editor e reenviar o
 * salvamento usam o mesmo id e não criam outra trilha.
 */
export default async function NovaTrilha() {
  await exigirAdmin();
  redirect(`/admin/catalogo/trilhas/${novoId<TrilhaId>()}?novo=1` as Route);
}
