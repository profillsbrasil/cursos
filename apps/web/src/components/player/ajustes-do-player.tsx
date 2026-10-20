"use client";

import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { VELOCIDADES, type Velocidade } from "@cursos/api/dominio/regras";
import { Button } from "@cursos/ui/components/button";
import { Kbd } from "@cursos/ui/components/kbd";
import { Popover, PopoverTrigger } from "@cursos/ui/components/popover";
import { Tooltip, TooltipTrigger } from "@cursos/ui/components/tooltip";
import { cn } from "@cursos/ui/lib/utils";
import { Captions, Keyboard, Settings } from "lucide-react";
import { type RefObject, useCallback, useRef, useState } from "react";

import { fmtNum, fmtVelocidade } from "@/lib/formato";
import type { EstadoDaSessao } from "@/lib/player/sessao";
import type { ComandoDoTeclado } from "@/lib/player/teclado";

import { DicaDoPlayer } from "./dica-do-player";
import { FOLHA, ICONE, TECLA } from "./partes";

const ATALHOS: readonly { faz: string; teclas: readonly string[] }[] = [
  { faz: "Reproduz e pausa", teclas: ["espaço", "k"] },
  { faz: "5 s para trás e para a frente", teclas: ["←", "→"] },
  { faz: "10 s para trás e para a frente", teclas: ["j", "l"] },
  { faz: "Volume", teclas: ["↑", "↓"] },
  { faz: "Silencia", teclas: ["m"] },
  { faz: "Liga e desliga a legenda", teclas: ["c"] },
  { faz: "Tela cheia", teclas: ["f"] },
];

function BotaoDeVelocidade({
  comandar,
  marcada,
  valor,
}: {
  comandar: (c: ComandoDoTeclado) => void;
  marcada: boolean;
  valor: Velocidade;
}) {
  const escolher = useCallback(
    () => comandar({ tipo: "velocidade", valor }),
    [comandar, valor]
  );
  return (
    <button
      aria-label={fmtVelocidade(valor)}
      aria-pressed={marcada}
      className={cn(
        "h-[30px] rounded-lg font-mono font-semibold text-xs tabular-nums transition-[background-color,color,box-shadow] duration-150 ease-forte",
        marcada
          ? "bg-sol text-sobre-cor hover:bg-sol-hover hover:shadow-brilho"
          : "text-foreground hover:bg-trilho hover:text-titulo"
      )}
      onClick={escolher}
      type="button"
    >
      {fmtNum(valor)}
    </button>
  );
}

/**
 * O item da folha sob o cursor e com o foco de teclado sobe um degrau de tom sobre o
 * `popover` da folha, até o `trilho`. O `cartao`, um degrau abaixo, deixava o item
 * focado com um fundo escuro que mal se via.
 */
const OPCAO =
  "flex h-[38px] w-full items-center gap-2.5 rounded-lg px-2 text-left text-foreground transition-colors duration-150 ease-forte hover:bg-trilho hover:text-titulo [&_svg]:size-[18px]";

/** O Esc devolve o foco à engrenagem já no quadro em que a folha começa a sair. */
const fechouNoEsc = (
  aberto: boolean,
  detalhes: PopoverPrimitive.Root.ChangeEventDetails
) => !aberto && detalhes.reason === "escape-key";

/**
 * A engrenagem da barra: a velocidade como escolha direta, a legenda e a lista de
 * atalhos. As duas folhas nascem dentro do player, porque em tela cheia só ele aparece.
 */
export function AjustesDoPlayer({
  atalhosAbertos,
  aoMudarAtalhos,
  comandar,
  estado,
  portal,
}: {
  atalhosAbertos: boolean;
  aoMudarAtalhos: (abertos: boolean) => void;
  comandar: (c: ComandoDoTeclado) => void;
  estado: Pick<EstadoDaSessao, "legenda" | "velocidade">;
  portal: RefObject<HTMLElement | null>;
}) {
  const [aberto, setAberto] = useState(false);
  const refEngrenagem = useRef<HTMLButtonElement>(null);
  const { legenda, velocidade } = estado;

  const alternarLegenda = useCallback(
    () => comandar({ tipo: "legenda" }),
    [comandar]
  );
  const abrirAtalhos = useCallback(() => {
    setAberto(false);
    aoMudarAtalhos(true);
  }, [aoMudarAtalhos]);
  // O Base UI só devolve o foco quando a folha termina de sair, 150 ms depois; até
  // lá o foco ficava no botão que some, como o 2× da velocidade.
  const mudarAjustes = useCallback(
    (abrir: boolean, detalhes: PopoverPrimitive.Root.ChangeEventDetails) => {
      setAberto(abrir);
      if (fechouNoEsc(abrir, detalhes)) {
        refEngrenagem.current?.focus();
      }
    },
    []
  );
  const mudarAtalhos = useCallback(
    (abrir: boolean, detalhes: PopoverPrimitive.Root.ChangeEventDetails) => {
      aoMudarAtalhos(abrir);
      if (fechouNoEsc(abrir, detalhes)) {
        refEngrenagem.current?.focus();
      }
    },
    [aoMudarAtalhos]
  );

  return (
    <>
      <Popover onOpenChange={mudarAjustes} open={aberto}>
        <Tooltip>
          <TooltipTrigger
            render={
              <PopoverTrigger
                render={
                  <Button
                    aria-label="Ajustes"
                    className={cn(ICONE, "data-[popup-open]:bg-accent")}
                    ref={refEngrenagem}
                    size="icon-lg"
                    variant="ghost"
                  />
                }
              />
            }
          >
            <Settings aria-hidden="true" />
          </TooltipTrigger>
          <DicaDoPlayer>Ajustes</DicaDoPlayer>
        </Tooltip>
        <PopoverPrimitive.Portal container={portal}>
          <PopoverPrimitive.Positioner
            align="end"
            className="z-50"
            positionMethod="fixed"
            side="top"
            sideOffset={8}
          >
            <PopoverPrimitive.Popup
              aria-label="Ajustes"
              className={cn(FOLHA, "grid w-[286px] gap-0.5")}
            >
              <fieldset className="m-0 grid gap-1 border-0 p-0">
                <legend className="mx-2 mt-1.5 mb-1 font-semibold text-muted-foreground text-xs">
                  Velocidade
                </legend>
                <div className="grid grid-cols-6 gap-1 px-1.5 pb-1.5">
                  {VELOCIDADES.map((v) => (
                    <BotaoDeVelocidade
                      comandar={comandar}
                      key={v}
                      marcada={v === velocidade}
                      valor={v}
                    />
                  ))}
                </div>
              </fieldset>
              {/* A folha tem 8 px de padding; a linha volta até a borda (The Edge To Edge Rule). */}
              <hr className="-mx-2 my-1 border-border" />
              <button
                aria-pressed={legenda}
                className={OPCAO}
                onClick={alternarLegenda}
                type="button"
              >
                <Captions aria-hidden="true" />
                <span className="flex-1">Legendas</span>
                <span className="text-muted-foreground">
                  {legenda ? "Ligadas" : "Desligadas"}
                </span>
              </button>
              <button className={OPCAO} onClick={abrirAtalhos} type="button">
                <Keyboard aria-hidden="true" />
                <span className="flex-1">Atalhos do teclado</span>
                <Kbd className={TECLA}>?</Kbd>
              </button>
            </PopoverPrimitive.Popup>
          </PopoverPrimitive.Positioner>
        </PopoverPrimitive.Portal>
      </Popover>
      <Popover onOpenChange={mudarAtalhos} open={atalhosAbertos}>
        <PopoverPrimitive.Portal container={portal}>
          <PopoverPrimitive.Positioner
            align="end"
            anchor={refEngrenagem}
            className="z-50"
            positionMethod="fixed"
            side="top"
            sideOffset={8}
          >
            <PopoverPrimitive.Popup
              className={cn(FOLHA, "w-[300px] px-3.5 py-3")}
            >
              <PopoverPrimitive.Title className="mb-2 font-semibold text-sm text-titulo">
                Atalhos do teclado
              </PopoverPrimitive.Title>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3.5 gap-y-1.5 text-[13px]">
                {ATALHOS.map(({ faz, teclas }) => (
                  <div className="contents" key={faz}>
                    <dt className="flex items-center gap-1">
                      {teclas.map((t) => (
                        <Kbd className={TECLA} key={t}>
                          {t}
                        </Kbd>
                      ))}
                    </dt>
                    <dd>{faz}</dd>
                  </div>
                ))}
              </dl>
            </PopoverPrimitive.Popup>
          </PopoverPrimitive.Positioner>
        </PopoverPrimitive.Portal>
      </Popover>
    </>
  );
}
