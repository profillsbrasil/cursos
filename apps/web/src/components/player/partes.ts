/** Classes que as peças do player dividem. Fora de módulo "use client", para o loading.tsx também poder lê-las. */

/** O botão de ícone da barra de controles: o foco de teclado ganha o mesmo fundo do cursor. */
export const ICONE =
  "relative size-[38px] rounded-[10px] text-foreground hover:bg-accent dark:hover:bg-accent [&_svg:not([class*='size-'])]:size-[18px]";

/** A tecla dos atalhos, com borda de 1 px e 2 px embaixo. */
export const TECLA =
  "h-auto min-w-0 rounded-[4px] border border-chart-5 border-b-2 bg-transparent px-1 font-mono text-[11px] text-foreground";

/**
 * A caixa do vídeo cabe na janela junto com o título e os controles. Os 288 px somam
 * o topo da página (42), o título com a linha do módulo e duas linhas de descrição
 * (116), o vão até o player (16), os controles com a borda (96), a moldura de baixo
 * (10) e 8 de folga. Descrição mais longa empurra os controles para baixo da dobra.
 * Em tela cheia o vídeo ocupa o que sobra dos controles.
 */
export const CAIXA_DO_VIDEO =
  "relative mx-auto aspect-video w-[min(100%,calc((100dvh_-_288px)*16/9))] min-w-[min(100%,320px)] [:fullscreen_&]:aspect-auto [:fullscreen_&]:h-full [:fullscreen_&]:w-full";

/** O popover dos ajustes e da lista de atalhos, abrindo sobre a barra. */
export const FOLHA =
  "z-50 rounded-[14px] border border-border bg-popover p-2 text-foreground text-sm shadow-xl transition-[opacity,scale] duration-150 ease-forte data-[ending-style]:scale-95 data-[starting-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 motion-reduce:transition-opacity motion-reduce:data-[ending-style]:scale-100 motion-reduce:data-[starting-style]:scale-100 origin-(--transform-origin)";
