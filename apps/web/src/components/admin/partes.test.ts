import { describe, expect, test } from "bun:test";
import { buttonVariants } from "@cursos/ui/components/button";
import { cn } from "@cursos/ui/lib/utils";
import { ICONE } from "./partes";

// O que o <Button> sem variant aplica: button.tsx faz
// cn(buttonVariants({ className, size, variant })) com variant "default".
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
});
