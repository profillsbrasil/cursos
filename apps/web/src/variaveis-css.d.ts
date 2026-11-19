import "react";

declare module "react" {
  /** A variável CSS no `style`, como `{ "--colunas": 3 }`: o React a passa ao elemento como propriedade customizada. */
  interface CSSProperties {
    [variavel: `--${string}`]: number | string | undefined;
  }
}
