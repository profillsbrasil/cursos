import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@cursos/ui/components/empty";
import { BookOpen } from "lucide-react";

export function PainelVazio() {
  return (
    <Empty className="rounded-[20px] bg-card px-6 py-14 ring-1 ring-border">
      <EmptyHeader className="max-w-md">
        <EmptyMedia
          className="size-12 rounded-full bg-ceu text-sobre-cor"
          variant="icon"
        >
          <BookOpen aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle className="font-bold text-lg text-titulo leading-[1.3]">
          Nenhum curso liberado ainda
        </EmptyTitle>
        <EmptyDescription className="text-muted-foreground text-sm">
          Os cursos aparecem aqui quando forem liberados para você.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
