"use client";

import { Combobox } from "@base-ui/react/combobox";
import { Select } from "@base-ui/react/select";
import { cn } from "@cursos/ui/lib/utils";
import { Check, ChevronDown, Search } from "lucide-react";
import { type AriaAttributes, type ReactNode, useCallback } from "react";

import {
  BUSCA_DA_SELECAO,
  DIVISOR_DA_SELECAO,
  GATILHO_DA_SELECAO,
  GRUPO_DA_SELECAO,
  ITEM_DA_SELECAO,
  LISTA_DA_SELECAO,
} from "./partes";

export interface OpcaoDaSelecao {
  descricao?: string;
  icone?: ReactNode;
  rotulo: string;
  valor: string;
}

export interface GrupoDaSelecao {
  grupo: string;
  opcoes: readonly OpcaoDaSelecao[];
}

export type ItemDaSelecao = OpcaoDaSelecao | GrupoDaSelecao;

type PropsDaSelecao = Pick<
  AriaAttributes,
  "aria-describedby" | "aria-invalid" | "aria-label"
> & {
  aoMudar: (valor: string) => void;
  className?: string;
  id: string;
  name?: string;
  opcoes: readonly ItemDaSelecao[];
  placeholder?: string;
  required?: boolean;
  tamanho?: keyof typeof GATILHO_DA_SELECAO;
  /** Valor sem opção (o "" de uma seleção de ação) mostra o placeholder. */
  valor: string;
};

const ehGrupo = (item: ItemDaSelecao): item is GrupoDaSelecao =>
  "grupo" in item;

const todasAsOpcoes = (itens: readonly ItemDaSelecao[]) =>
  itens.flatMap((item) => (ehGrupo(item) ? item.opcoes : [item]));

function ConteudoDaOpcao({ opcao }: { opcao: OpcaoDaSelecao }) {
  return (
    <>
      {opcao.icone}
      <span className="grid min-w-0 flex-1 gap-px">
        <span className="truncate">{opcao.rotulo}</span>
        {opcao.descricao ? (
          <span className="font-normal text-muted-foreground text-xs">
            {opcao.descricao}
          </span>
        ) : null}
      </span>
    </>
  );
}

const MARCA = <Check aria-hidden="true" className="text-sol" />;

function OpcaoDoSelect({ opcao }: { opcao: OpcaoDaSelecao }) {
  return (
    <Select.Item
      className={ITEM_DA_SELECAO}
      label={opcao.rotulo}
      value={opcao.valor}
    >
      <ConteudoDaOpcao opcao={opcao} />
      <Select.ItemIndicator className="ml-auto">{MARCA}</Select.ItemIndicator>
    </Select.Item>
  );
}

export function Selecao({
  aoMudar,
  className,
  id,
  name,
  opcoes,
  placeholder,
  required,
  tamanho = "campo",
  valor,
  ...aria
}: PropsDaSelecao) {
  const lista = todasAsOpcoes(opcoes);
  const escolhida = lista.some((o) => o.valor === valor) ? valor : null;
  const mudar = useCallback(
    (novo: string | null) => {
      if (novo !== null) {
        aoMudar(novo);
      }
    },
    [aoMudar]
  );
  return (
    <Select.Root
      items={lista.map((o) => ({ label: o.rotulo, value: o.valor }))}
      name={name}
      onValueChange={mudar}
      required={required}
      value={escolhida}
    >
      <Select.Trigger
        {...aria}
        className={cn(GATILHO_DA_SELECAO[tamanho], className)}
        data-slot="select-trigger"
        id={id}
      >
        <Select.Value className="truncate" placeholder={placeholder} />
        <ChevronDown aria-hidden="true" />
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner
          align="start"
          alignItemWithTrigger={false}
          className="z-50"
          sideOffset={6}
        >
          <Select.Popup className={LISTA_DA_SELECAO}>
            <Select.List>
              {opcoes.map((item, i) =>
                ehGrupo(item) ? (
                  <Select.Group key={item.grupo}>
                    {i > 0 ? (
                      <Select.Separator className={DIVISOR_DA_SELECAO} />
                    ) : null}
                    <Select.GroupLabel className={GRUPO_DA_SELECAO}>
                      {item.grupo}
                    </Select.GroupLabel>
                    {item.opcoes.map((o) => (
                      <OpcaoDoSelect key={o.valor} opcao={o} />
                    ))}
                  </Select.Group>
                ) : (
                  <OpcaoDoSelect key={item.valor} opcao={item} />
                )
              )}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}

interface GrupoDaBusca {
  grupo: string;
  items: readonly OpcaoDaSelecao[];
}

/** As opções soltas viram um grupo sem rótulo, porque o Combobox filtra grupos. */
function gruposDaBusca(itens: readonly ItemDaSelecao[]): GrupoDaBusca[] {
  const grupos: { grupo: string; items: OpcaoDaSelecao[] }[] = [];
  for (const item of itens) {
    if (ehGrupo(item)) {
      grupos.push({ grupo: item.grupo, items: [...item.opcoes] });
    } else if (grupos.at(-1)?.grupo === "") {
      grupos.at(-1)?.items.push(item);
    } else {
      grupos.push({ grupo: "", items: [item] });
    }
  }
  return grupos;
}

const mesmaOpcao = (a: OpcaoDaSelecao, b: OpcaoDaSelecao) =>
  a.valor === b.valor;
const rotuloDa = (o: OpcaoDaSelecao) => o.rotulo;
const valorDa = (o: OpcaoDaSelecao) => o.valor;

/** A Selecao com um campo de busca no topo da lista, para as listas que crescem. */
export function SelecaoComBusca({
  aoMudar,
  className,
  id,
  name,
  opcoes,
  placeholder,
  required,
  rotuloDaBusca,
  semResultado,
  tamanho = "campo",
  valor,
  ...aria
}: PropsDaSelecao & { rotuloDaBusca: string; semResultado: string }) {
  const escolhida =
    todasAsOpcoes(opcoes).find((o) => o.valor === valor) ?? null;
  const mudar = useCallback(
    (nova: OpcaoDaSelecao | null) => {
      if (nova !== null) {
        aoMudar(nova.valor);
      }
    },
    [aoMudar]
  );
  return (
    <Combobox.Root
      isItemEqualToValue={mesmaOpcao}
      items={gruposDaBusca(opcoes)}
      itemToStringLabel={rotuloDa}
      itemToStringValue={valorDa}
      name={name}
      onValueChange={mudar}
      required={required}
      value={escolhida}
    >
      <Combobox.Trigger
        {...aria}
        className={cn(GATILHO_DA_SELECAO[tamanho], className)}
        data-slot="select-trigger"
        id={id}
      >
        <span className="truncate">
          <Combobox.Value placeholder={placeholder} />
        </span>
        <ChevronDown aria-hidden="true" />
      </Combobox.Trigger>
      <Combobox.Portal>
        <Combobox.Positioner align="start" className="z-50" sideOffset={6}>
          <Combobox.Popup className={cn(LISTA_DA_SELECAO, "flex flex-col p-0")}>
            <div className={BUSCA_DA_SELECAO}>
              <Search aria-hidden="true" />
              <Combobox.Input
                aria-label={rotuloDaBusca}
                className="h-full min-w-0 flex-1 bg-transparent text-[13px] text-titulo placeholder:text-muted-foreground"
                placeholder="Buscar"
              />
            </div>
            <Combobox.Empty className="px-4 py-3 text-[13px] text-muted-foreground empty:hidden">
              {semResultado}
            </Combobox.Empty>
            <Combobox.List className="overflow-y-auto p-1.5 empty:hidden">
              {(grupo: GrupoDaBusca, i: number) => (
                <Combobox.Group items={grupo.items} key={grupo.grupo}>
                  {i > 0 ? (
                    <Combobox.Separator className={DIVISOR_DA_SELECAO} />
                  ) : null}
                  {grupo.grupo ? (
                    <Combobox.GroupLabel className={GRUPO_DA_SELECAO}>
                      {grupo.grupo}
                    </Combobox.GroupLabel>
                  ) : null}
                  <Combobox.Collection>
                    {(o: OpcaoDaSelecao) => (
                      <Combobox.Item
                        className={ITEM_DA_SELECAO}
                        key={o.valor}
                        value={o}
                      >
                        <ConteudoDaOpcao opcao={o} />
                        <Combobox.ItemIndicator className="ml-auto">
                          {MARCA}
                        </Combobox.ItemIndicator>
                      </Combobox.Item>
                    )}
                  </Combobox.Collection>
                </Combobox.Group>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
