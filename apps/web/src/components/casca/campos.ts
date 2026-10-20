import { cn } from "@cursos/ui/lib/utils";

// A borda Céu do foco e do cursor vem do index.css pelo data-slot (#30); o campo
// não desenha anel nem contorno. O dark: repete as cores que o Input traz com dark:.
const MOLDURA =
  "border-muted-foreground bg-background px-3.5 text-sm md:text-sm dark:border-muted-foreground dark:bg-background";

// A altura mora aqui: nenhum uso passa classe de altura.
export const CAMPO = cn(MOLDURA, "h-11 rounded-full");

// O Switch do packages/ui em 40 por 24 px, com o polegar de 18 px: desligada, o
// trilho com anel de 1 px em texto-apagado; ligada, Sol (o primary do tema) com
// o polegar em sobre-cor.
export const ALAVANCA =
  "px-0.5 data-[size=default]:h-6 data-[size=default]:w-10 data-unchecked:border-muted-foreground data-unchecked:bg-trilho dark:data-unchecked:bg-trilho [&_[data-slot=switch-thumb]]:size-[18px]";

// O rádio nativo dentro do label: o label lê o has-checked: e acende com o foco do
// input. Quem usa põe data-campo, que dá a borda Céu do index.css.
export const RADIO =
  "m-0 size-[18px] shrink-0 cursor-pointer appearance-none rounded-full border-[1.5px] border-muted-foreground checked:border-[5px] checked:border-sol disabled:cursor-not-allowed";

export const AREA = cn(
  MOLDURA,
  "min-h-0 rounded-[20px] py-[10.5px] leading-normal"
);

// A caixa de marcar em Sol, de 20 px. Marcada pelo aria-checked: o data-checked: sai
// num :where e perde para o dark:bg-background que apaga o dark:bg-input/30 do
// Checkbox do packages/ui. O after: do Checkbox recebe o toque, e o -inset-3.5 o
// leva a 45 px: ele parte de dentro da borda de 1,5 px, dos 17 px de dentro.
export const CAIXA =
  "size-5 rounded-[7px] border-[1.5px] border-muted-foreground bg-background transition-colors after:-inset-3.5 dark:bg-background aria-checked:border-sol aria-checked:text-sobre-cor dark:aria-checked:bg-sol dark:aria-checked:hover:bg-sol-hover [&_svg]:size-3.5 [&_svg]:stroke-[3.2]";

export const ROTULO = "font-semibold text-foreground text-sm";
