"use client";

import {
  CARACTERES,
  LIMITES,
  type MaterialDoDocumento,
} from "@cursos/api/dominio/edicao-do-curso";
import {
  formularioDoMaterial,
  mensagemDoMaterial,
  recusaAntesDeLer,
  TIPOS_DE_MATERIAL,
  TIPOS_E_LIMITE,
  tamanhoDoArquivo,
  tipoDoNome,
} from "@cursos/api/dominio/material";
import type { MaterialId } from "@cursos/api/dominio/tipos";
import { Button } from "@cursos/ui/components/button";
import { Input } from "@cursos/ui/components/input";
import { cn } from "@cursos/ui/lib/utils";
import { ChevronDown, ChevronUp, CircleAlert, FileUp, X } from "lucide-react";
import {
  type ChangeEvent,
  type Dispatch,
  type DragEvent,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

import { BOTAO_CONTORNO, PEQUENO } from "@/components/casca/botoes";
import { SeloDoTipo } from "@/components/material-de-apoio/selo-do-tipo";
import {
  type Direcao,
  focarDepois,
  novoId,
  setaDepoisDeMover,
  vizinhoQueFica,
} from "@/lib/editor";
import { plural } from "@/lib/formato";
import { useAcao } from "@/lib/use-acao";
import { trpcClient } from "@/utils/trpc";

import { ErroDoCampo, SaiuDoCampo, useErroDoCampo } from "./erros-do-editor";
import { ICONE, Secao } from "./partes";
import { ID } from "./rascunho-do-curso";
import {
  type AcaoDoEditor,
  dentroDoLimite,
  type EnvioDeMaterial,
  type RascunhoDoEditor,
} from "./rascunho-do-editor";

const ESCOLHER = "material-escolher";
const ACEITOS = Object.keys(TIPOS_DE_MATERIAL)
  .map((t) => `.${t}`)
  .join(",");

const FALHA_DO_ENVIO = "Não deu para enviar. Tente de novo em instantes.";

/** Uma linha do cartão: 1 px de borda a borda em cima, padding só dentro dela. */
const LINHA =
  "grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3.5 border-border border-t px-5 py-3 first:border-t-0";

const DETALHE = "truncate text-muted-foreground text-xs tabular-nums";

const tirarDe = (id: string) => `material-${id}-tirar`;

export function resumoDoMaterial(
  materiais: readonly Pick<MaterialDoDocumento, "bytes">[]
): string {
  if (materiais.length === 0) {
    return "Nenhum arquivo";
  }
  const total = materiais.reduce((s, m) => s + m.bytes, 0);
  return `${plural(materiais.length, "arquivo", "arquivos")}, ${tamanhoDoArquivo(total)}`;
}

function LinhaDoMaterial({
  despachar,
  indice,
  material,
  materiais,
}: {
  despachar: Dispatch<AcaoDoEditor>;
  indice: number;
  material: MaterialDoDocumento;
  materiais: readonly MaterialDoDocumento[];
}) {
  const { id } = material;
  const campo = ID.material(id);
  const { aria, mensagem } = useErroDoCampo(campo);
  const saiuDoCampo = useContext(SaiuDoCampo);
  const sair = useCallback(() => saiuDoCampo(campo), [campo, saiuDoCampo]);
  const total = materiais.length;
  const nome = material.titulo.trim() || material.nomeDoArquivo;
  const renomear = useCallback(
    (e: ChangeEvent<HTMLInputElement>) =>
      despachar({ id, tipo: "material_renomeado", titulo: e.target.value }),
    [despachar, id]
  );
  const mover = useCallback(
    (direcao: Direcao) => {
      despachar({ direcao, id, tipo: "material_movido" });
      const destino = direcao === "acima" ? indice - 1 : indice + 1;
      focarDepois(
        `material-${id}-${setaDepoisDeMover(direcao, destino === 0 || destino === total - 1)}`
      );
    },
    [despachar, id, indice, total]
  );
  const subir = useCallback(() => mover("acima"), [mover]);
  const descer = useCallback(() => mover("abaixo"), [mover]);
  const tirar = useCallback(() => {
    const fica = vizinhoQueFica(materiais, indice);
    despachar({ id, tipo: "material_removido" });
    focarDepois(fica ? tirarDe(fica.id) : ESCOLHER);
  }, [despachar, id, indice, materiais]);
  return (
    <li className={LINHA}>
      <SeloDoTipo tipo={material.tipo} />
      <div className="grid min-w-0 gap-0.5">
        <label className="sr-only" htmlFor={campo}>
          Título do material {indice + 1}
        </label>
        <Input
          {...aria}
          autoComplete="off"
          className="-ml-2.5 h-9 rounded-full border-transparent bg-transparent px-2.5 font-semibold text-sm text-titulo md:text-sm dark:bg-transparent"
          id={campo}
          maxLength={CARACTERES.tituloDoMaterial}
          onBlur={sair}
          onChange={renomear}
          required
          value={material.titulo}
        />
        <p className={DETALHE}>
          {material.nomeDoArquivo} · {tamanhoDoArquivo(material.bytes)}
        </p>
        <ErroDoCampo id={campo} mensagem={mensagem} />
      </div>
      <span className="-mr-2 flex">
        <Button
          aria-label={`Subir ${nome}`}
          className={ICONE}
          disabled={indice === 0}
          id={`material-${id}-acima`}
          onClick={subir}
        >
          <ChevronUp aria-hidden="true" />
        </Button>
        <Button
          aria-label={`Descer ${nome}`}
          className={ICONE}
          disabled={indice === total - 1}
          id={`material-${id}-abaixo`}
          onClick={descer}
        >
          <ChevronDown aria-hidden="true" />
        </Button>
        <Button
          aria-label={`Tirar ${nome}`}
          className={cn(ICONE, "hover:text-destructive")}
          id={tirarDe(id)}
          onClick={tirar}
        >
          <X aria-hidden="true" />
        </Button>
      </span>
    </li>
  );
}

function LinhaDoEnvio({
  despachar,
  envio,
  proximo,
}: {
  despachar: Dispatch<AcaoDoEditor>;
  envio: EnvioDeMaterial;
  /** Quem recebe o foco quando esta linha sai. */
  proximo: string;
}) {
  const { estado, id, nomeDoArquivo } = envio;
  const tirar = useCallback(() => {
    despachar({ id, tipo: "envio_tirado" });
    focarDepois(proximo);
  }, [despachar, id, proximo]);
  const recusado = estado.tipo === "recusado";
  return (
    <li className={LINHA}>
      <SeloDoTipo recusado={recusado} tipo={envio.tipo} />
      <div className="grid min-w-0 gap-1">
        <p className="truncate font-semibold text-sm text-titulo">
          {nomeDoArquivo}
        </p>
        {recusado ? (
          <p className="flex items-start gap-1.5 text-destructive text-xs">
            <CircleAlert
              aria-hidden="true"
              className="mt-px size-3.5 shrink-0"
            />
            {estado.motivo}
          </p>
        ) : (
          <>
            <div
              aria-label={`Enviando ${nomeDoArquivo}`}
              className="h-1 overflow-hidden rounded-full bg-trilho ring-1 ring-muted-foreground"
              role="progressbar"
            >
              <div className="h-full w-1/3 animate-pulse rounded-full bg-ceu" />
            </div>
            <p className={DETALHE}>
              Enviando · {tamanhoDoArquivo(envio.bytes)}
            </p>
          </>
        )}
      </div>
      {recusado ? (
        <Button
          aria-label={`Tirar ${nomeDoArquivo}`}
          className={cn(ICONE, "-mr-2")}
          id={tirarDe(id)}
          onClick={tirar}
        >
          <X aria-hidden="true" />
        </Button>
      ) : (
        <span />
      )}
    </li>
  );
}

function envioDe(arquivo: File): EnvioDeMaterial {
  const recusa = recusaAntesDeLer(arquivo.name, arquivo.size);
  return {
    bytes: arquivo.size,
    estado: recusa
      ? { motivo: mensagemDoMaterial(recusa), tipo: "recusado" }
      : { tipo: "enviando" },
    id: novoId<MaterialId>(),
    nomeDoArquivo: arquivo.name,
    tipo: tipoDoNome(arquivo.name),
  };
}

/**
 * Cada arquivo sobe sozinho por admin.catalogo.enviarMaterial, que devolve a
 * chave no bucket; ele só entra no curso quando o admin salva. O que o navegador
 * já sabe recusar (tipo, tamanho, o 21º arquivo) não chega a subir.
 */
export function MaterialDeApoio({
  despachar,
  estado,
}: {
  despachar: Dispatch<AcaoDoEditor>;
  estado: Pick<RascunhoDoEditor, "daGeracao" | "rascunho">;
}) {
  const { materiais } = estado.rascunho;
  const { envios } = estado.daGeracao;
  const { executar } = useAcao();
  const entrada = useRef<HTMLInputElement>(null);
  const [arrastando, setArrastando] = useState(false);

  const enviar = useCallback(
    (arquivos: readonly File[]) => {
      if (arquivos.length === 0) {
        return;
      }
      const novos = dentroDoLimite(estado, arquivos.map(envioDe));
      despachar({ envios: novos, tipo: "materiais_escolhidos" });
      novos.forEach((envio, i) => {
        const arquivo = arquivos[i];
        if (envio.estado.tipo !== "enviando" || !arquivo) {
          return;
        }
        executar(
          () =>
            trpcClient.admin.catalogo.enviarMaterial.mutate(
              formularioDoMaterial(arquivo)
            ),
          {
            aoRecusar: (_motivo, mensagem) =>
              despachar({
                id: envio.id,
                motivo: mensagem ?? FALHA_DO_ENVIO,
                tipo: "material_recusado",
              }),
            depois: ({ tituloSugerido, ...guardado }) =>
              despachar({
                material: { ...guardado, id: envio.id, titulo: tituloSugerido },
                tipo: "material_recebido",
              }),
            erro: FALHA_DO_ENVIO,
          }
        );
      });
    },
    [despachar, estado, executar]
  );

  const escolhidos = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      enviar([...(e.target.files ?? [])]);
      e.target.value = "";
    },
    [enviar]
  );
  const abrirEscolha = useCallback(() => entrada.current?.click(), []);
  const sobre = useCallback((e: DragEvent<HTMLDivElement>) => {
    if (e.dataTransfer.types.includes("Files")) {
      e.preventDefault();
      setArrastando(true);
    }
  }, []);
  const fora = useCallback(() => setArrastando(false), []);
  const soltou = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setArrastando(false);
      enviar([...e.dataTransfer.files]);
    },
    [enviar]
  );

  const vazio = materiais.length === 0 && envios.length === 0;
  return (
    <Secao
      id="material"
      resumo={resumoDoMaterial(materiais)}
      titulo="Material de apoio"
    >
      {/* biome-ignore lint/a11y: as duas regras de interação acusam o alvo de soltar; soltar arquivo é atalho do mouse; o teclado usa o botão Escolher arquivos. */}
      <div
        className={cn(
          "rounded-[20px] transition-shadow duration-150 ease-forte",
          arrastando && "shadow-[inset_0_0_0_1.5px_var(--ceu)]"
        )}
        data-arrastando={arrastando || undefined}
        onDragLeave={fora}
        onDragOver={sobre}
        onDrop={soltou}
      >
        {vazio ? (
          <p className="px-5 py-4 text-muted-foreground text-sm">
            Sem arquivo, a página do curso não mostra material de apoio.
          </p>
        ) : (
          <ul aria-label="Arquivos do material de apoio">
            {materiais.map((m, i) => (
              <LinhaDoMaterial
                despachar={despachar}
                indice={i}
                key={m.id}
                materiais={materiais}
                material={m}
              />
            ))}
            {envios.map((x, i) => {
              const fica = vizinhoQueFica(envios, i);
              return (
                <LinhaDoEnvio
                  despachar={despachar}
                  envio={x}
                  key={x.id}
                  proximo={fica ? tirarDe(fica.id) : ESCOLHER}
                />
              );
            })}
          </ul>
        )}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5 border-border border-t bg-muted/30 px-5 py-4">
          <p className="min-w-0 flex-[1_1_260px] text-[13px] text-muted-foreground">
            <span className="font-semibold text-foreground">
              Arraste arquivos aqui
            </span>{" "}
            ou escolha no computador. {TIPOS_E_LIMITE}, até {LIMITES.materiais}{" "}
            por curso. O aluno baixa na página do curso.
          </p>
          <input
            accept={ACEITOS}
            className="sr-only"
            multiple
            onChange={escolhidos}
            ref={entrada}
            tabIndex={-1}
            type="file"
          />
          <Button
            className={cn(BOTAO_CONTORNO, PEQUENO)}
            id={ESCOLHER}
            onClick={abrirEscolha}
          >
            <FileUp aria-hidden="true" className="size-4" />
            Escolher arquivos
          </Button>
        </div>
      </div>
    </Secao>
  );
}
