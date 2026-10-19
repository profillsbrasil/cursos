"use client";

import { AlertDialog as Primitivo } from "@base-ui/react/alert-dialog";
import { useClerk } from "@clerk/nextjs";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@cursos/ui/components/alert-dialog";
import { cn } from "@cursos/ui/lib/utils";
import { LogOut, Trash2 } from "lucide-react";
import { useCallback } from "react";

import { BOTAO_CONTORNO } from "@/components/casca/botoes";
import { plural } from "@/lib/formato";

import { ACOES, CONTORNO_PEQUENO } from "./partes";
import type { Usuario } from "./tipos";
import { useAcaoDaConta } from "./use-acao-da-conta";

const PERIGO = cn(
  CONTORNO_PEQUENO,
  "text-destructive hover:border-destructive dark:hover:border-destructive"
);

const EXCLUIR = cn(
  BOTAO_CONTORNO,
  "border-destructive bg-destructive text-sobre-cor hover:border-destructive hover:bg-destructive/85",
  "dark:border-destructive dark:bg-destructive dark:hover:border-destructive dark:hover:bg-destructive/85"
);

function ExcluirConta({
  certificados,
  user,
}: {
  certificados: number;
  user: Usuario;
}) {
  const { executar, pendente } = useAcaoDaConta();
  const excluir = useCallback(
    () =>
      executar(() => user.delete(), {
        depois: () => window.location.assign("/"),
        sensivel: true,
      }),
    [executar, user]
  );
  return (
    <AlertDialog>
      <AlertDialogTrigger className={PERIGO}>
        <Trash2 aria-hidden="true" className="size-4" />
        Excluir conta
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-[calc(100%-2rem)] gap-4 rounded-[22px] p-6 shadow-black/45 shadow-xl ring-border data-[size=default]:max-w-md data-[size=default]:sm:max-w-md">
        <AlertDialogTitle className="font-semibold text-lg text-titulo">
          Excluir sua conta?
        </AlertDialogTitle>
        <AlertDialogDescription
          className="grid gap-2 text-pretty text-[13px] text-foreground md:text-pretty"
          render={<div />}
        >
          <p>A conta some de vez, e não dá para desfazer. Você perde:</p>
          <ul className="grid list-disc gap-1 pl-5 text-muted-foreground">
            <li>as liberações dos cursos, inclusive as trocadas por pontos;</li>
            <li>
              os pontos, a sequência e as medalhas{certificados > 0 ? ";" : "."}
            </li>
            {certificados > 0 ? (
              <li>
                o seu nome{" "}
                {certificados === 1
                  ? "no certificado que você ganhou"
                  : `nos ${plural(certificados, "certificado", "certificados")} que você ganhou`}
                , no PDF e na conferência pública.
              </li>
            ) : null}
          </ul>
        </AlertDialogDescription>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Primitivo.Close className={CONTORNO_PEQUENO} disabled={pendente}>
            Manter a conta
          </Primitivo.Close>
          <button
            className={cn(EXCLUIR, "h-9 px-3.5 text-[13px]")}
            disabled={pendente}
            onClick={excluir}
            type="button"
          >
            Excluir a conta
          </button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function SecaoDeSair({
  certificados,
  user,
}: {
  certificados: number;
  user: Usuario;
}) {
  const { signOut } = useClerk();
  const sair = useCallback(() => signOut({ redirectUrl: "/" }), [signOut]);
  return (
    <div className={cn(ACOES, "justify-between")}>
      <button className={CONTORNO_PEQUENO} onClick={sair} type="button">
        <LogOut aria-hidden="true" className="size-4" />
        Sair da conta
      </button>
      <ExcluirConta certificados={certificados} user={user} />
    </div>
  );
}
