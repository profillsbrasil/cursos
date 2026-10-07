import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@cursos/ui/components/empty";
import { BookOpen } from "lucide-react";

// Zero liberações: diz com qual conta a pessoa entrou e quem libera as trilhas.
export function PainelVazio({ conta }: { conta: string | null }) {
  return (
    <Empty className="rounded-[20px] bg-card px-6 py-14 ring-1 ring-border">
      <EmptyHeader className="max-w-md">
        <EmptyMedia
          className="size-12 rounded-full bg-ceu text-sobre-cor"
          variant="icon"
        >
          <BookOpen aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle className="font-bold text-lg text-titulo">
          Nenhum curso liberado ainda
        </EmptyTitle>
        <EmptyDescription className="text-muted-foreground text-sm">
          {conta ? (
            <>
              Você entrou como{" "}
              <b className="font-semibold text-foreground">{conta}</b>.{" "}
            </>
          ) : null}
          As trilhas aparecem aqui quando o admin da Profills libera para a sua
          conta. Se você esperava ver cursos, confira se entrou com a conta
          certa ou fale com quem cuida do treinamento.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
