import { describe, expect, test } from "bun:test";
import { buttonVariants } from "@cursos/ui/components/button";
import { cn } from "@cursos/ui/lib/utils";
import { ICONE } from "./partes";

const classesDoBotao = (className: string) =>
  cn(buttonVariants({ className, size: "default", variant: "default" })).split(
    " "
  );

describe("ICONE como className de um Button sem variant", () => {
  const classes = classesDoBotao(ICONE);

  test("não herda o fundo amarelo da variante default", () => {
    expect(classes).not.toContain("bg-primary");
    expect(classes).not.toContain("text-primary-foreground");
    expect(classes).not.toContain("hover:bg-primary/80");
    expect(classes).toContain("bg-transparent");
  });

  test("glifo apagado em repouso, fundo muted no hover", () => {
    expect(classes).toContain("text-muted-foreground");
    expect(classes).toContain("hover:bg-muted");
    expect(classes).toContain("hover:text-foreground");
  });

  // O focusableWhenDisabled do Base UI põe data-disabled e aria-disabled, não
  // disabled: as classes disabled: do Button não pegam o Remover de aula assistida.
  test("desligado por data-disabled: meia opacidade, sem pintar no hover, cursor de não permitido", () => {
    expect(classes).toContain("data-disabled:opacity-50");
    expect(classes).toContain("data-disabled:cursor-not-allowed");
    expect(classes).toContain("data-disabled:hover:bg-transparent");
    expect(classes).toContain("data-disabled:hover:text-muted-foreground");
  });
});
