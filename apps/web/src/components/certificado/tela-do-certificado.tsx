import type { PaginaDoCertificado } from "@cursos/api/dominio/pagina-do-certificado";
import type { DiaISO } from "@cursos/api/dominio/tipos";
import { cn } from "@cursos/ui/lib/utils";
import {
  ArrowRight,
  Award,
  Check,
  Download,
  ListChecks,
  type LucideIcon,
  Play,
  UserRound,
} from "lucide-react";
import Link from "next/link";

import { BOTAO, LINK_NO_TEXTO } from "@/components/casca/botoes";
import { CARTAO } from "@/components/casca/cartoes";
import { diaCurto, diaEmSaoPaulo, plural } from "@/lib/formato";
import { caminhoDoCertificado, caminhoDoCurso, MINHA_CONTA } from "@/lib/rotas";

import { CopiarLink } from "./copiar-link";
import { Fatos } from "./fatos";
import { cargaEmHoras, comNome, enderecoDaConferencia, folhaDo } from "./folha";
import { FolhaNaTela } from "./folha-na-tela";

const TITULO_DO_CARTAO = "font-semibold text-lg text-titulo leading-[1.3]";

export const GRADE_DO_CERTIFICADO =
  "grid items-start gap-8 min-[1081px]:grid-cols-[minmax(0,1fr)_300px]";

function ItemQueFalta({
  children,
  cumprido,
  icone: Icone,
}: {
  children: React.ReactNode;
  cumprido: boolean;
  icone: LucideIcon;
}) {
  return (
    <li className="flex items-center gap-2.5">
      {cumprido ? (
        <Check aria-hidden="true" className="text-ceu size-4" />
      ) : (
        <Icone aria-hidden="true" className="text-canela size-4" />
      )}
      {children}
    </li>
  );
}

function Pendente({
  pagina,
}: {
  pagina: Extract<PaginaDoCertificado, { tipo: "falta" }>;
}) {
  const { feitas, total } = pagina.aulas;
  const { aprovados, total: questionarios } = pagina.questionarios;

  return (
    <div className={GRADE_DO_CERTIFICADO}>
      <div
        aria-hidden="true"
        className="border-muted-foreground/40 text-muted-foreground relative grid aspect-[1123/794] place-items-center overflow-hidden rounded-[6px] border-[1.5px] border-dashed p-6 text-center"
      >
        <span className="bg-sidebar/70 absolute inset-x-0 top-0 h-[14%]" />
        <span className="bg-border absolute inset-x-[6%] bottom-[16%] h-px" />
        <p>A folha do certificado aparece aqui.</p>
      </div>
      <section
        aria-labelledby="certificado-pendente"
        className={cn(CARTAO, "grid justify-items-start gap-4 p-7")}
      >
        <span className="bg-popover text-ceu grid size-12 place-items-center rounded-full">
          <Award aria-hidden="true" className="size-[22px]" />
        </span>
        <div>
          <h2 className={TITULO_DO_CARTAO} id="certificado-pendente">
            O certificado sai quando você concluir o curso
          </h2>
          <p className="text-muted-foreground mt-1">
            Assista a todas as aulas e passe em todos os questionários.
          </p>
        </div>
        <ul className="grid gap-2 tabular-nums">
          <ItemQueFalta cumprido={feitas === total} icone={Play}>
            {feitas} de {plural(total, "aula assistida", "aulas assistidas")}
          </ItemQueFalta>
          {questionarios > 0 ? (
            <ItemQueFalta
              cumprido={aprovados === questionarios}
              icone={ListChecks}
            >
              {aprovados} de{" "}
              {plural(
                questionarios,
                "questionário aprovado",
                "questionários aprovados"
              )}
            </ItemQueFalta>
          ) : null}
        </ul>
        <Link className={BOTAO} href={caminhoDoCurso(pagina.curso.slug)}>
          Ver o que falta
          <ArrowRight aria-hidden="true" />
        </Link>
      </section>
    </div>
  );
}

export function TelaDoCertificado({
  hoje,
  origem,
  pagina,
}: {
  hoje: DiaISO;
  origem: string;
  pagina: PaginaDoCertificado;
}) {
  if (pagina.tipo === "falta") {
    return <Pendente pagina={pagina} />;
  }

  const { categoria, certificado, slug } = pagina;
  const endereco = enderecoDaConferencia(origem, certificado.codigo);
  const comONome = comNome(certificado);

  const fatos = [
    ["Curso", certificado.tituloDoCurso],
    ["Concluído em", diaCurto(diaEmSaoPaulo(certificado.emitidoEm), hoje)],
    ["Carga horária", cargaEmHoras(certificado.horas)],
    ["Código", certificado.codigo],
  ] as const;

  return (
    <div className={GRADE_DO_CERTIFICADO}>
      {comONome ? (
        <FolhaNaTela folha={folhaDo(comONome, endereco)} />
      ) : (
        <section
          aria-labelledby="falta-o-nome"
          className={cn(CARTAO, "grid justify-items-start gap-4 p-7")}
        >
          <span className="bg-popover text-ceu grid size-12 place-items-center rounded-full">
            <UserRound aria-hidden="true" className="size-[22px]" />
          </span>
          <h2 className={TITULO_DO_CARTAO} id="falta-o-nome">
            Falta o seu nome na conta
          </h2>
          <p className="text-muted-foreground max-w-[60ch] text-pretty">
            O certificado leva o nome da sua conta, e ela ainda não tem um.
            Ponha o nome em{" "}
            <Link
              className={cn(LINK_NO_TEXTO, "text-foreground font-medium")}
              href={MINHA_CONTA}
            >
              Minha conta
            </Link>{" "}
            e volte aqui para baixar o PDF.
          </p>
        </section>
      )}
      <aside
        aria-label="Dados do certificado"
        className={cn(CARTAO, "grid gap-4 py-[22px] [--pad:22px]")}
      >
        <div className="px-(--pad)">
          <h2 className={TITULO_DO_CARTAO}>{certificado.tituloDoCurso}</h2>
          <p className="text-muted-foreground mt-0.5">{categoria}</p>
        </div>
        <Fatos fatos={fatos} />
        {comONome ? (
          <div className="grid gap-2 px-(--pad)">
            <a
              className={cn(BOTAO, "w-full")}
              download
              href={`${caminhoDoCertificado(slug)}/pdf`}
            >
              <Download aria-hidden="true" />
              Baixar PDF
            </a>
            <CopiarLink url={endereco.url} />
          </div>
        ) : null}
        <p className="text-muted-foreground px-(--pad) text-[13px] text-pretty">
          Quem tiver o link ou o código confere o certificado sem entrar na
          plataforma.
        </p>
      </aside>
    </div>
  );
}
