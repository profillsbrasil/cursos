/** Classes que as ilhas da casca dividem. Fora de módulo "use client", para um Server Component também poder lê-las. */

export const FOCO =
  "focus-visible:ring-0 focus-visible:outline-2 focus-visible:outline-ceu focus-visible:outline-solid focus-visible:outline-offset-2";

/** O tooltip da casca: claro sobre a sidebar escura, com a seta da mesma cor. */
export const DICA =
  "rounded-[7px] bg-titulo px-2.5 py-1.5 font-semibold text-sobre-cor text-xs *:data-[side]:bg-titulo *:data-[side]:fill-titulo";

/** O texto secundário dentro do tooltip ("Ctrl B", "Em breve", o título da aula). */
export const DICA_SECUNDARIA = "font-normal text-sobre-cor/70";
