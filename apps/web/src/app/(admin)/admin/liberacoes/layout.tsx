import type { ReactNode } from "react";

import { ProvedorDoLote } from "@/components/admin/provedor-do-lote";

export default function LayoutDeAlunos({ children }: { children: ReactNode }) {
  return <ProvedorDoLote>{children}</ProvedorDoLote>;
}
