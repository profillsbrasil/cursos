"use client";

import type { Papel } from "@cursos/api/context";
import type { Perfil } from "@cursos/api/dominio/perfil";
import { Switch } from "@cursos/ui/components/switch";
import { cn } from "@cursos/ui/lib/utils";
import { useCallback, useState } from "react";

import { ALAVANCA, RADIO } from "@/components/casca/campos";
import { useAcao } from "@/lib/use-acao";
import { trpcClient } from "@/utils/trpc";

import { ORDEM_DOS_PERFIS, SOBRE_O_PERFIL } from "./perfis";

function OpcaoDePerfil({
  desligada,
  escolher,
  escolhida,
  grupo,
  perfil,
}: {
  desligada: boolean;
  escolher: (p: Perfil) => void;
  escolhida: boolean;
  grupo: string;
  perfil: Perfil;
}) {
  const aoEscolher = useCallback(() => escolher(perfil), [escolher, perfil]);
  return (
    <label className="flex cursor-pointer items-start gap-3.5 border-border border-t px-[22px] py-3.5 transition-colors hover:bg-white/8 has-checked:bg-sol/6">
      <input
        checked={escolhida}
        className={cn(RADIO, "mt-px")}
        data-campo
        disabled={desligada}
        name={grupo}
        onChange={aoEscolher}
        type="radio"
        value={perfil}
      />
      <span className="grid gap-0.5">
        <span className="font-semibold text-titulo">
          {SOBRE_O_PERFIL[perfil].nome}
        </span>
        <span className="text-[12.5px] text-muted-foreground">
          {SOBRE_O_PERFIL[perfil].descricao}
        </span>
      </span>
    </label>
  );
}

/**
 * O perfil e o papel de uma pessoa. Enquanto a mudança vai e a página recarrega,
 * a tela mostra o que o admin escolheu; depois, o que o servidor gravou.
 */
export function AcessoDaPessoa({
  nome,
  papel,
  perfil,
  souEu,
  userId,
}: {
  nome: string;
  papel: Papel;
  perfil: Perfil;
  souEu: boolean;
  userId: string;
}) {
  const doPerfil = useAcao();
  const doPapel = useAcao();
  const [perfilPedido, pedirPerfil] = useState(perfil);
  const [papelPedido, pedirPapel] = useState(papel);
  const perfilNaTela = doPerfil.pendente ? perfilPedido : perfil;
  const admin = (doPapel.pendente ? papelPedido : papel) === "admin";
  const { executar: executarPerfil } = doPerfil;
  const { executar: executarPapel } = doPapel;

  const escolherPerfil = useCallback(
    (novo: Perfil) => {
      pedirPerfil(novo);
      executarPerfil(
        () =>
          trpcClient.admin.pessoas.definirPerfil.mutate({
            perfil: novo,
            userId,
          }),
        { sucesso: `${nome} agora é ${SOBRE_O_PERFIL[novo].nome}.` }
      );
    },
    [executarPerfil, nome, userId]
  );

  const mudarPapel = useCallback(
    (virarAdmin: boolean) => {
      const novo: Papel = virarAdmin ? "admin" : "aluno";
      pedirPapel(novo);
      executarPapel(
        () =>
          trpcClient.admin.pessoas.definirPapel.mutate({ papel: novo, userId }),
        {
          sucesso: `${nome} ${virarAdmin ? "agora é admin" : "deixou de ser admin"}. Vale quando a sessão renovar, em até 1 minuto.`,
        }
      );
    },
    [executarPapel, nome, userId]
  );

  return (
    <>
      <fieldset className="m-0 min-w-0 border-0 p-0">
        <legend className="px-[22px] pb-2.5 font-semibold text-[13px] text-muted-foreground">
          Perfil
        </legend>
        {ORDEM_DOS_PERFIS.map((p) => (
          <OpcaoDePerfil
            desligada={doPerfil.pendente}
            escolher={escolherPerfil}
            escolhida={perfilNaTela === p}
            grupo={`perfil-${userId}`}
            key={p}
            perfil={p}
          />
        ))}
      </fieldset>
      <div className="flex items-start gap-3.5 border-border border-t px-[22px] py-3.5">
        <label
          className="grid flex-1 cursor-pointer gap-0.5"
          htmlFor={`admin-${userId}`}
        >
          <span className="font-semibold text-titulo">Admin</span>
          <span className="text-[12.5px] text-muted-foreground">
            {souEu
              ? "Você não pode tirar o seu próprio papel de admin. Outro admin pode."
              : "Cria cursos, libera, revoga, publica comunicados e muda o acesso das pessoas."}
          </span>
        </label>
        <Switch
          checked={admin}
          className={cn(ALAVANCA, "mt-0.5")}
          disabled={souEu || doPapel.pendente}
          id={`admin-${userId}`}
          onCheckedChange={mudarPapel}
        />
      </div>
    </>
  );
}
