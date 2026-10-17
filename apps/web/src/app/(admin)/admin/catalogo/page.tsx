import type { Metadata } from "next";

import { VisaoDoCatalogo } from "@/components/admin/visao-do-catalogo";
import { carregarCatalogo } from "@/server/api";

export const metadata: Metadata = { title: "Catálogo · Admin" };

export default async function Catalogo() {
  return <VisaoDoCatalogo visao={await carregarCatalogo()} />;
}
