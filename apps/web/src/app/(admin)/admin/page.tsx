import { redirect } from "next/navigation";

// Catálogo é a única tela do admin por enquanto.
export default function Admin() {
  redirect("/admin/catalogo");
}
