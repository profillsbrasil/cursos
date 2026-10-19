"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@cursos/ui/components/avatar";
import { Input } from "@cursos/ui/components/input";
import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useId,
  useRef,
  useState,
} from "react";

import { CAMPO } from "@/components/casca/campos";
import { COR_DA_FOLHA } from "@/components/certificado/cores-da-folha";
import { iniciais, plural } from "@/lib/formato";

import {
  ACAO_NA_LINHA,
  ACOES,
  AVISO,
  BOTAO_PEQUENO,
  CONTORNO_PEQUENO,
  RESUMO_DA_SECAO,
  ROTULO,
  SECAO,
  TITULO_DA_SECAO,
} from "./partes";
import type { Usuario } from "./tipos";
import { useAcaoDaConta } from "./use-acao-da-conta";

/** As cores da folha do certificado, a mesma do PDF e da prévia. */
const COR = COR_DA_FOLHA;

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
    <div className="flex flex-wrap items-center gap-4">
      <Avatar className="size-16 after:hidden">
        {user.hasImage ? <AvatarImage alt="" src={user.imageUrl} /> : null}
        <AvatarFallback className="bg-canela font-bold text-[22px] text-sobre-cor">
          {iniciais(nome || "?")}
        </AvatarFallback>
      </Avatar>
      <div className={ACOES}>
        <button
          className={CONTORNO_PEQUENO}
          disabled={pendente}
          onClick={escolher}
          type="button"
        >
          Trocar foto
        </button>
        <input
          accept="image/jpeg,image/png,image/gif,image/webp"
          aria-label="Escolher a foto"
          className="sr-only"
          onChange={trocar}
          ref={arquivo}
          tabIndex={-1}
          type="file"
        />
        {user.hasImage ? (
          <button
            className={ACAO_NA_LINHA}
            disabled={pendente}
            onClick={remover}
            type="button"
          >
            Remover foto
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function SecaoDoNome({
  certificados,
  user,
}: {
  certificados: number;
  user: Usuario;
}) {
  const id = useId();
  const { executar, pendente } = useAcaoDaConta();
  const [{ nome, sobrenome }, setCampos] = useState({
    nome: user.firstName ?? "",
    sobrenome: user.lastName ?? "",
  });
  const completo = juntar(nome, sobrenome);
  const mudou =
    nome.trim() !== (user.firstName ?? "") ||
    sobrenome.trim() !== (user.lastName ?? "");
  const mudar = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCampos((c) => ({ ...c, [name]: value }));
  }, []);
  const salvar = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      executar(
        () =>
          user.update({ firstName: nome.trim(), lastName: sobrenome.trim() }),
        { sucesso: "Nome salvo." }
      );
    },
    [executar, nome, sobrenome, user]
  );
  return (
    <section aria-labelledby={`${id}-titulo`} className={SECAO}>
      <header>
        <h2 className={TITULO_DA_SECAO} id={`${id}-titulo`}>
          Seu nome
        </h2>
        <p className={RESUMO_DA_SECAO}>Sai assim nos seus certificados.</p>
      </header>
      <Foto nome={completo} user={user} />
      <form className="grid gap-4" onSubmit={salvar}>
        <div className="grid @min-[28rem]:grid-cols-2 gap-2.5">
          <label className="grid gap-1.5" htmlFor={`${id}-nome`}>
            <span className={ROTULO}>Nome</span>
            <Input
              autoComplete="given-name"
              className={CAMPO}
              id={`${id}-nome`}
              maxLength={256}
              name="nome"
              onChange={mudar}
              placeholder="Ana"
              required
              value={nome}
            />
          </label>
          <label className="grid gap-1.5" htmlFor={`${id}-sobrenome`}>
            <span className={ROTULO}>Sobrenome</span>
            <Input
              autoComplete="family-name"
              className={CAMPO}
              id={`${id}-sobrenome`}
              maxLength={256}
              name="sobrenome"
              onChange={mudar}
              placeholder="Souza"
              value={sobrenome}
            />
          </label>
        </div>
        <figure
          aria-label="Prévia do nome no certificado"
          className="relative grid gap-1 overflow-hidden rounded-[10px] py-4 pr-[18px] pl-[23px]"
          style={{ backgroundColor: COR.papel, color: COR.tinta }}
        >
          <span
            aria-hidden="true"
            className="absolute inset-y-0 left-0 w-[5px] bg-sol"
          />
          <span
            className="font-medium text-xs"
            style={{ color: COR.tintaClara }}
          >
            Certificado de conclusão
          </span>
          <span className="min-h-[26px] break-words font-bold text-xl tracking-tight">
            {completo || (
              <span style={{ color: COR.linha }}>Seu nome aqui</span>
            )}
          </span>
        </figure>
        {certificados > 0 ? (
          <p className={AVISO}>
            {certificados === 1 ? "O " : "Os "}
            <b className="font-semibold">
              {plural(certificados, "certificado", "certificados")}
            </b>{" "}
            que você já tem {certificados === 1 ? "passa" : "passam"} a sair com
            o nome novo, no PDF e na conferência pública.
          </p>
        ) : null}
        <div className={ACOES}>
          <button
            className={BOTAO_PEQUENO}
            disabled={pendente || !mudou || nome.trim() === ""}
            type="submit"
          >
            Salvar nome
          </button>
        </div>
      </form>
    </section>
  );
}
