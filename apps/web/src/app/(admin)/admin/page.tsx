import { redirect } from "next/navigation";

import { exigirAdmin } from "@/server/api";

// Catálogo é a única tela do admin por enquanto. O layout e a página rodam em
// paralelo, então a porta vem antes do redirect: quem não é admin vê a 404 e
// não descobre /admin/catalogo pelo Location.
export default async function Admin() {
  await exigirAdmin();
  redirect("/admin/catalogo");
}
