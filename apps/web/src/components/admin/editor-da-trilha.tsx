"use client";

import type { CursoNaVisao } from "@cursos/api/dominio/catalogo";
import {
  type EdicaoDaTrilha,
  LIMITES_DA_TRILHA,
  TRILHA_EM_USO,
} from "@cursos/api/dominio/edicao-da-trilha";
import { Field, FieldLabel } from "@cursos/ui/components/field";
import { Textarea } from "@cursos/ui/components/textarea";
import { cn } from "@cursos/ui/lib/utils";
import { ArrowLeft, TriangleAlert } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useId,
  useState,
} from "react";

import { focarDepois, focarOPrimeiro } from "@/lib/editor";
import { plural } from "@/lib/formato";
import { useAcao } from "@/lib/use-acao";
import { useDaGeracao, useRascunhoApoiado } from "@/lib/use-rascunho-apoiado";
import { trpcClient } from "@/utils/trpc";

import { BarraDeSalvar } from "./barra-de-salvar";
import { CampoDeTexto } from "./campo-lido";
import { ConfirmacaoNaLinha, type LinhaAberta } from "./confirmacao-na-linha";
import { CursosDaTrilha } from "./cursos-da-trilha";
import { ErroDoCampo, ErrosDoEditor, useErroDoCampo } from "./erros-do-editor";
import {
  type CampoDaTrilha,
  focoDepois,
  ID_DA_TRILHA,
  lerRascunhoDaTrilha,
  type MudancaDaTrilha,
  type Perda,
  perdas,
  problemasNaTela,
  type RascunhoDaTrilha,
  REGRAS_DA_TRILHA,
  type RecusaDaTrilha,
  recusaDaTrilha,
} from "./estado-da-trilha";
import { AVISO, CAMPO, ROTULO, Secao } from "./partes";
import { errosPorCampo } from "./problemas";

type MudarTexto = (
  e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
) => void;

function CampoDaDescricao({
  mudarTexto,
  valor,
}: {
  mudarTexto: MudarTexto;
  valor: string;
}) {
  const id = ID_DA_TRILHA.campo("descricao");
  const { aria, mensagem } = useErroDoCampo(id);
  return (
    <Field data-invalid={mensagem ? true : undefined}>
      <FieldLabel className={ROTULO} htmlFor={id}>
        Descrição
      </FieldLabel>
      <Textarea
        {...aria}
        className={cn(CAMPO, "min-h-28 py-3 leading-relaxed")}
        id={id}
        maxLength={LIMITES_DA_TRILHA.descricao}
        name="descricao"
        onChange={mudarTexto}
        placeholder="O que a pessoa aprende do primeiro ao último curso."
        value={valor}
      />
      <ErroDoCampo id={id} mensagem={mensagem} />
    </Field>
  );
}

function DadosDaTrilha({
  mudarTexto,
  rascunho,
}: {
  mudarTexto: MudarTexto;
  rascunho: RascunhoDaTrilha;
}) {
  return (
    <div className="grid gap-5 p-5">
      <CampoDeTexto
        id={ID_DA_TRILHA.campo("titulo")}
        maxLength={LIMITES_DA_TRILHA.titulo}
        name="titulo"
        onChange={mudarTexto}
        placeholder="Fábrica e montagem"
        required
        rotulo="Título"
        value={rascunho.titulo}
      />
      <CampoDeTexto
        ajuda="Letras minúsculas, números e hífen."
        autoCapitalize="none"
        id={ID_DA_TRILHA.campo("slug")}
        maxLength={LIMITES_DA_TRILHA.slug}
        name="slug"
        onChange={mudarTexto}
        placeholder="fabrica-e-montagem"
        required
        rotulo="Endereço"
        spellCheck={false}
        value={rascunho.slug}
      />
      <CampoDaDescricao mudarTexto={mudarTexto} valor={rascunho.descricao} />
    </div>
  );
}

const quemComecou = (pessoas: number) =>
  pessoas === 0
    ? "Ninguém tinha começado."
    : `${plural(pessoas, "pessoa já tinha começado", "pessoas já tinham começado")}.`;

/**
 * Inserir e reordenar não fecham curso começado. Tirar fecha: quem só tinha a
 * trilha perde o curso na hora, e o número vem do servidor na abertura.
 */
export function AvisoDePerda({
  alunos,
  perdas: tirados,
  sujo,
}: {
  alunos: number;
  perdas: readonly Perda[];
  sujo: boolean;
}) {
  if (alunos === 0 || !sujo) {
    return null;
  }
  const quemTem = `${plural(alunos, "pessoa tem", "pessoas têm")} esta trilha liberada, e a mudança vale na hora.`;
  return (
    <div className={AVISO} role="status">
      <TriangleAlert
        aria-hidden="true"
        className="mt-0.5 size-4 shrink-0 text-sol"
      />
      {tirados.length === 0 ? (
        <p>{quemTem} Curso que alguém já começou continua aberto.</p>
      ) : (
        <div className="grid gap-2">
          <p>{quemTem}</p>
          <ul className="grid gap-1.5">
            {tirados.map((p) => (
              <li key={p.cursoId}>
                <span className="font-semibold">{p.titulo}</span>: quem só tinha
                a trilha perde o curso na hora.
                {p.pessoas === null ? null : (
                  <span className="tabular-nums">
                    {" "}
                    {quemComecou(p.pessoas)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ApagarTrilha({ edicao }: { edicao: EdicaoDaTrilha }) {
  const router = useRouter();
  const id = useId();
  const remocao = useAcao();
  const [chave, pedir] = useState<string | null>(null);
  const fechar = useCallback(
    (minha: string) => pedir((atual) => (atual === minha ? null : atual)),
    []
  );
  const linhaAberta: LinhaAberta = { chave, fechar, pedir };
  const { titulo, id: trilhaId } = edicao.documento;
  const apagar = useCallback(
    () =>
      remocao.executar(
        () => trpcClient.admin.catalogo.apagarTrilha.mutate({ id: trilhaId }),
        {
          depois: () => router.replace("/admin/catalogo"),
          sucesso: (r) =>
            r.apagado
              ? `"${titulo}" foi apagada.`
              : `"${titulo}" já tinha sido apagada.`,
        }
      ),
    [remocao.executar, router, titulo, trilhaId]
  );
  return (
    <section
      aria-labelledby={id}
      className="mt-12 grid max-w-[70ch] gap-3 border-border border-t pt-6"
    >
      <h2 className="font-bold text-lg text-titulo tracking-tight" id={id}>
        Apagar a trilha
      </h2>
      {edicao.podeApagar ? (
        <ConfirmacaoNaLinha
          botao={{ nome: `Confirmar: apagar ${titulo}`, rotulo: "Apagar" }}
          chave="apagar"
          className="grid gap-3"
          confirmar={apagar}
          enviando={remocao.pendente}
          gatilho={{ nome: `Apagar ${titulo}`, rotulo: "Apagar" }}
          linhaAberta={linhaAberta}
          pergunta={
            <span className="text-foreground text-sm">
              Ninguém recebeu esta trilha. Apagar? Os cursos dela continuam no
              catálogo, soltos.
            </span>
          }
        />
      ) : (
        <p className="text-muted-foreground text-sm leading-relaxed">
          {TRILHA_EM_USO}
        </p>
      )}
    </section>
  );
}

export function EditorDaTrilha({
  cursos,
  edicao,
}: {
  /** O catálogo inteiro: os nomes da lista e os candidatos da busca. */
  cursos: readonly CursoNaVisao[];
  edicao: EdicaoDaTrilha;
}) {
  const {
    base,
    descartar,
    geracao,
    mudar: despachar,
    novo,
    pendente,
    rascunho,
    salvar,
    sujo,
    titulo,
    versaoMudou,
  } = useRascunhoApoiado({
    caminho: `/admin/catalogo/trilhas/${edicao.documento.id}` as Route,
    pagina: edicao.documento,
    regras: REGRAS_DA_TRILHA,
  });
  const [tentou, setTentou] = useDaGeracao<boolean>(geracao, false);
  const [recusa, setRecusa] = useDaGeracao<RecusaDaTrilha | null>(
    geracao,
    null
  );

  const lido = lerRascunhoDaTrilha(rascunho, base);
  const problemas = problemasNaTela({ lido, rascunho, recusa, tentou });

  const mudar = useCallback(
    (m: MudancaDaTrilha) => {
      const alvo = focoDepois(rascunho, m);
      despachar(m);
      if (alvo) {
        focarDepois(alvo);
      }
    },
    [despachar, rascunho]
  );

  const mudarTexto = useCallback<MudarTexto>(
    (e) =>
      despachar({
        mudanca: { [e.target.name as CampoDaTrilha]: e.target.value },
        tipo: "campos",
      }),
    [despachar]
  );

  const enviar = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (lido.tipo === "problemas") {
        setTentou(true);
        focarOPrimeiro(
          lido.problemas.flatMap((p) => (p.campo ? [p.campo] : []))
        );
        return;
      }
      setTentou(false);
      setRecusa(null);
      const enviado = rascunho;
      salvar(
        lido.documento,
        () => trpcClient.admin.catalogo.salvarTrilha.mutate(lido.documento),
        {
          aoRecusar: (motivo) => {
            const r = recusaDaTrilha(motivo, enviado);
            setRecusa(r);
            if (r) {
              focarDepois(ID_DA_TRILHA.campo(r.campo));
            }
          },
          sucesso: novo ? "Trilha criada." : "Trilha salva.",
        }
      );
    },
    [lido, novo, rascunho, salvar, setRecusa, setTentou]
  );

  return (
    <>
      <ErrosDoEditor value={errosPorCampo(problemas)}>
        <form className="grid gap-10" noValidate onSubmit={enviar}>
          <div>
            <Link
              className="mb-5 inline-flex min-h-10 items-center gap-2 rounded-full pr-2 font-medium text-muted-foreground text-sm transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ceu focus-visible:outline-solid focus-visible:outline-offset-2"
              href="/admin/catalogo"
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              Catálogo
            </Link>
            <header className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1.5">
              <h1
                className="min-w-0 break-words font-bold text-3xl text-titulo tracking-tight focus:outline-none"
                ref={titulo}
                tabIndex={-1}
              >
                {novo ? "Nova trilha" : base.titulo}
              </h1>
              <p className="text-muted-foreground">
                O curso seguinte abre quando o anterior é concluído
              </p>
            </header>
          </div>

          <div className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
            <Secao
              id="trilha-dados"
              resumo="Aparece em Meus cursos"
              titulo="Dados"
            >
              <DadosDaTrilha mudarTexto={mudarTexto} rascunho={rascunho} />
            </Secao>

            <Secao
              id={ID_DA_TRILHA.cursos}
              resumo={plural(rascunho.cursos.length, "curso", "cursos")}
              titulo="Cursos da trilha"
            >
              <CursosDaTrilha
                catalogo={cursos}
                mudar={mudar}
                rascunho={rascunho}
                trilhaId={base.id}
              />
            </Secao>
          </div>

          <BarraDeSalvar
            novo={novo}
            oQue="esta trilha"
            pendente={pendente}
            problemas={problemas}
            recarregar={descartar}
            sujo={sujo}
            versaoMudou={versaoMudou}
          >
            <AvisoDePerda
              alunos={edicao.uso.alunosComATrilha}
              perdas={perdas({
                catalogo: cursos,
                rascunho,
                salvo: base.cursos,
                uso: edicao.uso,
              })}
              sujo={sujo}
            />
          </BarraDeSalvar>
        </form>
      </ErrosDoEditor>

      {novo ? null : <ApagarTrilha edicao={edicao} />}
    </>
  );
}
