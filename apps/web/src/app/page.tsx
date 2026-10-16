import { redirect } from "next/navigation";

// O aluno não tem Início: Meus cursos é a primeira tela (PRODUCT.md).
export default function Raiz() {
  redirect("/meus-cursos");
}
