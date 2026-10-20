import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { TelaNaoEncontrada } from "@/components/aluno/tela-nao-encontrada";
import { BOTAO, BOTAO_CONTORNO } from "@/components/casca/botoes";

const TITULO = "Página não encontrada";

// Vale porque o generateMetadata da ficha, do acesso e do editor chama notFound().
export const metadata: Metadata = { title: `${TITULO} · Admin` };

// notFound() das telas do admin: fica dentro da casca do admin, com a volta
// para as telas dele. Quem não é admin cai antes, no notFound() do layout, que
// sobe para a 404 do app.
export default function AdminNaoEncontrado() {
  return (
    <TelaNaoEncontrada
      texto="O curso ou a pessoa deste endereço não existe, ou o endereço mudou. Procure em Pessoas ou no Catálogo."
      titulo={TITULO}
    >
      <div className="flex flex-wrap gap-2.5">
        <Link className={BOTAO} href="/admin/pessoas">
          <ArrowLeft aria-hidden="true" />
          Voltar para Pessoas
        </Link>
        <Link className={BOTAO_CONTORNO} href="/admin/catalogo">
          Ver o Catálogo
        </Link>
      </div>
    </TelaNaoEncontrada>
  );
}
