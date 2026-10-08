import type { Route } from "next";
import { redirect } from "next/navigation";

import { exigirAdmin } from "@/server/api";

/**
 * O id do curso novo nasce aqui, uma vez, e fica na URL: recarregar o rascunho
 * mantém o id, e o reenvio do primeiro salvamento não cria outro curso.
 */
export default async function NovoCurso() {
  await exigirAdmin();
  redirect(`/admin/catalogo/cursos/${crypto.randomUUID()}?novo=1` as Route);
}
