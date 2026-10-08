import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@cursos/ui/components/avatar";

const ESPACOS = /\s+/;

/** "Ana Souza" vira "AS"; e-mail ou userId vira a primeira letra. */
function iniciais(nome: string) {
  const partes = nome.trim().split(ESPACOS);
  const primeira = partes[0]?.[0] ?? "?";
  const ultima = partes.length > 1 ? (partes.at(-1)?.[0] ?? "") : "";
  return `${primeira}${ultima}`.toUpperCase();
}

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
