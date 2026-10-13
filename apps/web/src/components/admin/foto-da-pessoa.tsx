import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@cursos/ui/components/avatar";

import { iniciais } from "@/lib/formato";

export function FotoDaPessoa({
  foto,
  nome,
  size,
}: {
  foto: string | null;
  nome: string;
  size?: "default" | "lg";
}) {
  return (
    <Avatar className={size === "lg" ? "size-14" : "size-10"} size={size}>
      {foto ? <AvatarImage alt="" src={foto} /> : null}
      <AvatarFallback className="bg-ceu/14 font-semibold text-ceu">
        {iniciais(nome)}
      </AvatarFallback>
    </Avatar>
  );
}
