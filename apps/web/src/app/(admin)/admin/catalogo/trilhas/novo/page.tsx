import type { Route } from "next";
import { redirect } from "next/navigation";

import { exigirAdmin } from "@/server/api";

/**
 * O id da trilha nova nasce aqui, uma vez: recarregar o editor e reenviar o
 * salvamento usam o mesmo id e não criam outra trilha.
 */
export default async function NovaTrilha() {
  await exigirAdmin();
  redirect(`/admin/catalogo/trilhas/${crypto.randomUUID()}?novo=1` as Route);
}
