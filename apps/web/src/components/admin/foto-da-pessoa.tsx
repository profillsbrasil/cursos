import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@cursos/ui/components/avatar";

import { cn } from "@cursos/ui/lib/utils";

import { iniciais } from "@/lib/formato";

export function FotoDaPessoa({
  className,
  foto,
  nome,
  size,
}: {
  className?: string;
  foto: string | null;
  nome: string;
  size?: "default" | "lg";
}) {
  return (
    <Avatar
      className={cn(size === "lg" ? "size-14" : "size-10", className)}
      size={size}
    >
      {foto ? <AvatarImage alt="" src={foto} /> : null}
      <AvatarFallback className="bg-ceu/14 font-semibold text-ceu">
        {iniciais(nome)}
      </AvatarFallback>
    </Avatar>
  );
}
