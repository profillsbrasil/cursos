"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@cursos/ui/components/avatar";
import { Button } from "@cursos/ui/components/button";
import { FieldError } from "@cursos/ui/components/field";
import { Input } from "@cursos/ui/components/input";
import { cn } from "@cursos/ui/lib/utils";
import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useId,
  useRef,
  useState,
} from "react";

import { CONTORNO_DESLIGADO, PEQUENO } from "@/components/casca/botoes";
import { CAMPO, ROTULO } from "@/components/casca/campos";
import { FolhaNaTela } from "@/components/certificado/folha-na-tela";
import { folhaComONome } from "@/components/certificado/medidas-da-folha";
import { iniciais, plural } from "@/lib/formato";
import { fotoNoLado } from "@/lib/foto-do-clerk";
import { type CampoDoNome, LIMITE_DO_NOME, problemaDoNome } from "./nome";
import {
  ACAO_NA_LINHA,
  ACOES,
  BOTAO_PEQUENO,
  CARTAO,
  DETALHE_DA_LINHA,
  PE_DO_CARTAO,
} from "./partes";
import type { FolhaDaConta, Usuario } from "./tipos";
import { useAcaoDaConta } from "./use-acao-da-conta";

const juntar = (nome: string, sobrenome: string) =>
  `${nome.trim()} ${sobrenome.trim()}`.trim();

function Foto({ nome, user }: { nome: string; user: Usuario }) {
  const { executar, pendente } = useAcaoDaConta();
  const arquivo = useRef<HTMLInputElement>(null);
  const trocar = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (file) {
        executar(() => user.setProfileImage({ file }), {
          sucesso: "Foto trocada.",
        });
      }
    },
    [executar, user]
  );
  const escolher = useCallback(() => arquivo.current?.click(), []);
  const remover = useCallback(
    () =>
      executar(() => user.setProfileImage({ file: null }), {
        sucesso: "Foto removida.",
      }),
    [executar, user]
  );
  return (
    <div className="flex min-w-0 items-center gap-4">
      <Avatar className="size-20 shrink-0 after:hidden">
        {user.hasImage ? (
          <AvatarImage alt="" src={fotoNoLado(user.imageUrl, 80)} />
        ) : null}
        <AvatarFallback className="bg-canela font-bold text-[26px] text-sobre-cor">
          {iniciais(nome || "?")}
        </AvatarFallback>
      </Avatar>
      <div className="grid min-w-0 gap-0.5">
        <h2 className="wrap-anywhere font-bold text-2xl text-titulo leading-tight tracking-[-0.025em]">
          {nome || "Seu nome"}
        </h2>
        <p className={DETALHE_DA_LINHA}>
          {user.primaryEmailAddress?.emailAddress}
        </p>
        <div className="mt-2 flex flex-wrap gap-x-3.5 gap-y-1">
          <button
            className={ACAO_NA_LINHA}
            disabled={pendente}
            onClick={escolher}
            type="button"
          >
            Trocar foto
          </button>
          {/* Fora da árvore de acessibilidade: o Trocar foto é o controle, e o campo de
              arquivo só anunciaria o "No file chosen" do navegador. O click() abre o
              seletor mesmo com o campo em display: none. */}
          <input
            accept="image/jpeg,image/png,image/gif,image/webp"
            hidden
            onChange={trocar}
            ref={arquivo}
            type="file"
          />
          {user.hasImage ? (
            <button
              aria-label="Remover a foto"
              className={ACAO_NA_LINHA}
              disabled={pendente}
              onClick={remover}
              type="button"
            >
              Remover
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function legendaDaFolha(exemplo: boolean, mudou: boolean) {
  if (mudou) {
    return "Prévia: este nome ainda não foi salvo";
  }
  return exemplo
    ? "Exemplo: o seu primeiro certificado sai assim"
    : "Assim o nome sai no certificado";
}

/**
 * Parado (nada mudou ou o nome não passa na regra), o Salvar é o contorno
 * desligado e focável, e diz por quê; enviando, fica Sol com o desligado.
 */
function SalvarNome({
  descritoPor,
  idDeNadaMudou,
  parado,
  pendente,
}: {
  descritoPor: string;
  idDeNadaMudou: string;
  parado: boolean;
  pendente: boolean;
}) {
  return (
    <>
      <Button
        aria-describedby={parado ? descritoPor : undefined}
        className={
          parado && !pendente ? cn(CONTORNO_DESLIGADO, PEQUENO) : BOTAO_PEQUENO
        }
        disabled={pendente || parado}
        focusableWhenDisabled
        type="submit"
      >
        Salvar nome
      </Button>
      <span className="sr-only" id={idDeNadaMudou}>
        Nada mudou no nome.
      </span>
    </>
  );
}

/** O topo de Minha conta: quem é a pessoa, com o nome salvo, os campos do nome e, ao lado, a folha do certificado com o nome dos campos. */
export function SecaoDoNome({
  certificados,
  folha,
  user,
}: {
  certificados: number;
  folha: FolhaDaConta;
  user: Usuario;
}) {
  const id = useId();
  const { executar, pendente } = useAcaoDaConta();
  const [{ nome, sobrenome }, setCampos] = useState({
    nome: user.firstName ?? "",
    sobrenome: user.lastName ?? "",
  });
  // O cartão mostra o nome salvo no Clerk; a folha, o que a pessoa digita.
  const salvo = juntar(user.firstName ?? "", user.lastName ?? "");
  const completo = juntar(nome, sobrenome);
  const mudou =
    nome.trim() !== (user.firstName ?? "") ||
    sobrenome.trim() !== (user.lastName ?? "");
  // O campo avisa a regra antes de enviar, e o Salvar diz por que está apagado.
  const problema = mudou ? problemaDoNome(nome, sobrenome) : null;
  const idDoErro = `${id}-erro`;
  const idDeNadaMudou = `${id}-nada-mudou`;
  const marcar = (campo: CampoDoNome) =>
    problema?.campos.includes(campo)
      ? { "aria-describedby": idDoErro, "aria-invalid": true }
      : {};
  const mudar = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCampos((c) => ({ ...c, [name]: value }));
  }, []);
  const salvar = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (problema) {
        return;
      }
      executar(
        () =>
          user.update({ firstName: nome.trim(), lastName: sobrenome.trim() }),
        { sucesso: "Nome salvo." }
      );
    },
    [executar, nome, problema, sobrenome, user]
  );
  return (
    <section
      aria-label="Seu nome"
      className={cn(
        CARTAO,
        "grid @min-[48rem]:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]"
      )}
    >
      {/* O Salvar mora no pé, preso embaixo: a coluna acompanha a altura da folha ao lado. */}
      <form className="grid grid-rows-[1fr_auto]" onSubmit={salvar}>
        <div className="@container grid content-start gap-[18px] @min-[48rem]:p-[26px] p-[22px]">
          <Foto nome={salvo} user={user} />
          <div className="grid @min-[24rem]:grid-cols-2 gap-3">
            <label className="grid min-w-0 gap-1.5" htmlFor={`${id}-nome`}>
              <span className={ROTULO}>Nome</span>
              <Input
                {...marcar("nome")}
                autoComplete="given-name"
                className={CAMPO}
                id={`${id}-nome`}
                maxLength={LIMITE_DO_NOME}
                name="nome"
                onChange={mudar}
                placeholder="Ana"
                required
                value={nome}
              />
            </label>
            <label className="grid min-w-0 gap-1.5" htmlFor={`${id}-sobrenome`}>
              <span className={ROTULO}>Sobrenome</span>
              <Input
                {...marcar("sobrenome")}
                autoComplete="family-name"
                className={CAMPO}
                id={`${id}-sobrenome`}
                maxLength={LIMITE_DO_NOME}
                name="sobrenome"
                onChange={mudar}
                placeholder="Souza"
                value={sobrenome}
              />
            </label>
            {problema ? (
              <FieldError className="@min-[24rem]:col-span-2" id={idDoErro}>
                {problema.frase}
              </FieldError>
            ) : null}
          </div>
          {certificados > 0 ? (
            <p className={DETALHE_DA_LINHA}>
              {certificados === 1 ? "O " : "Os "}
              <b className="font-semibold text-foreground">
                {plural(certificados, "certificado", "certificados")}
              </b>{" "}
              que você já tem {certificados === 1 ? "passa" : "passam"} a sair
              com o nome novo, no PDF e na conferência pública.
            </p>
          ) : null}
        </div>
        <div className={cn(PE_DO_CARTAO, "@min-[48rem]:px-[26px]")}>
          <div className={ACOES}>
            <SalvarNome
              descritoPor={problema ? idDoErro : idDeNadaMudou}
              idDeNadaMudou={idDeNadaMudou}
              parado={!mudou || problema !== null}
              pendente={pendente}
            />
          </div>
        </div>
      </form>
      <div className="grid content-center justify-items-center gap-3.5 border-border border-t @min-[48rem]:border-t-0 @min-[48rem]:border-l bg-sidebar @min-[48rem]:p-7 p-5">
        <FolhaNaTela
          // O nome salvo antes do limite pode ter palavra maior que a linha: ela quebra na folha.
          className="wrap-anywhere w-full max-w-[440px] -rotate-[1.2deg] shadow-[0_10px_30px_rgb(0_0_0/0.35)]"
          folha={folhaComONome(folha.folha, completo || "Seu nome aqui")}
        />
        <p className="text-center text-muted-foreground text-xs">
          {legendaDaFolha(folha.exemplo, mudou)}
        </p>
      </div>
    </section>
  );
}
