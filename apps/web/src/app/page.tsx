import { redirect } from "next/navigation";

// Até o Início existir, a raiz leva para Meus cursos.
export default function Raiz() {
  redirect("/meus-cursos");
}
