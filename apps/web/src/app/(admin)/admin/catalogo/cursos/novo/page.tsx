import type { Route } from "next";
import { redirect } from "next/navigation";

import { exigirAdmin } from "@/server/api";

export default async function NovoCurso() {
  await exigirAdmin();
  redirect(`/admin/catalogo/cursos/${crypto.randomUUID()}?novo=1` as Route);
}
