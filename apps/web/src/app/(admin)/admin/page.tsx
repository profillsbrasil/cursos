import { redirect } from "next/navigation";

import { exigirAdmin } from "@/server/api";

// /admin abre no primeiro item do menu. O layout e a página rodam em paralelo,
// então a porta vem antes do redirect: quem não é admin vê a 404 e não descobre
// /admin/alunos pelo Location.
export default async function Admin() {
  await exigirAdmin();
  redirect("/admin/alunos");
}
