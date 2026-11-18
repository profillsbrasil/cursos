import type {
  CursoNaVisao,
  VisaoDoCatalogo as Visao,
} from "@cursos/api/dominio/catalogo";
import { cn } from "@cursos/ui/lib/utils";
import { Eye, Layers, Library, Plus, Star } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";

import { BOTAO } from "@/components/casca/botoes";
import { CabecalhoDaPagina } from "@/components/casca/cabecalho-da-pagina";
import { CARTAO } from "@/components/casca/cartoes";
import { SELO } from "@/components/casca/selos";
import { fmtHoras, fmtPts, plural } from "@/lib/formato";

import { SeloDeSituacao, seloDoCurso } from "./acompanhamento";
import { GradeDoCatalogo } from "./filtro-do-catalogo";

const NOVO_CURSO = "/admin/catalogo/cursos/novo";

// Sobre a imagem, o selo e o preço levam o fundo da página por baixo da cor.
const SOBRE_A_CAPA = "absolute bg-background";

// Céu a 14% por cima do fundo: o gradiente de uma cor só pinta sobre o bg-background.
const PUBLICADO = {
  classe: "bg-linear-to-r from-ceu/14 to-ceu/14 text-ceu",
  icone: Eye,
  rotulo: "Publicado",
};

/** A coluna mede de 250 px até pouco menos de 520 px, quando a grade ganha outra. */
const SIZES_DA_CAPA = "(max-width: 767px) 100vw, 520px";

function tamanho(curso: CursoNaVisao) {
  return curso.aulas === 0
    ? "Nenhuma aula ainda"
    : `${plural(curso.aulas, "aula", "aulas")} · ${fmtHoras(curso.segundosDeVideo)}`;
}

/**
 * O título é o link, e o ::after dele cobre o cartão: uma parada de teclado por
 * curso, com o título como nome. O anel e a imagem acendem com qualquer parte do
 * cartão sob o cursor e com o foco do link (group-has-hover, que o globals.css
 * também casa com o foco).
 */
function CartaoDoCurso({ curso }: { curso: CursoNaVisao }) {
  const apagada = curso.status === "em_producao" && curso.aulas === 0;
  return (
    <article className="group relative grid min-w-0 content-start gap-3">
      <div className="bg-sidebar ring-border group-has-hover:ring-ceu relative aspect-[900/604] overflow-hidden rounded-[14px] ring-1 transition-shadow duration-200">
        <Image
          alt=""
          className={cn(
            "ease-forte object-cover transition-transform duration-200 group-has-hover:scale-[1.03] motion-reduce:transition-none",
            apagada && "brightness-70 grayscale-60"
          )}
          fill
          sizes={SIZES_DA_CAPA}
          src={curso.capa.url}
        />
        <SeloDeSituacao
          className={cn(SOBRE_A_CAPA, "top-2.5 left-2.5")}
          selo={
            curso.status === "publicado"
              ? PUBLICADO
              : seloDoCurso("em_producao")
          }
        />
        {curso.precoTroca !== null && (
          <span
            className={cn(
              SELO,
              SOBRE_A_CAPA,
              "text-foreground right-2.5 bottom-2.5 tabular-nums"
            )}
          >
            <Star aria-hidden="true" className="text-sol" />
            {fmtPts(curso.precoTroca)}
          </span>
        )}
      </div>
      <div className="min-w-0">
        <h2 className="text-titulo text-lg leading-[1.3] font-semibold">
          <Link
            className="after:absolute after:inset-0 after:rounded-[14px]"
            href={`/admin/catalogo/cursos/${curso.id}` as Route}
          >
            {curso.titulo}
          </Link>
        </h2>
        <p className="text-muted-foreground text-[13px] break-words">
          {curso.categoria} · {curso.codigo}
        </p>
      </div>
      <p className="text-muted-foreground flex flex-wrap gap-x-3.5 gap-y-1 text-[13px] tabular-nums">
        {curso.modulos > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <Layers aria-hidden="true" className="size-3.5" />
            {plural(curso.modulos, "módulo", "módulos")}
          </span>
        )}
        <span>{tamanho(curso)}</span>
      </p>
    </article>
  );
}

function AtalhoNovoCurso() {
  return (
    <Link
      className="border-trilho text-foreground hover:border-ceu grid aspect-[900/604] min-w-0 place-content-center justify-items-center gap-2.5 rounded-[14px] border-[1.5px] border-dashed p-4 text-center transition-colors hover:bg-white/8"
      href={NOVO_CURSO}
    >
      <span className="bg-sol text-sobre-cor grid size-11 place-items-center rounded-full">
        <Plus aria-hidden="true" className="size-5" />
      </span>
      <span className="text-titulo text-base font-semibold">Novo curso</span>
      <span className="text-muted-foreground max-w-[26ch] text-xs">
        Começa em produção: o aluno vê na lista, sem abrir aula
      </span>
    </Link>
  );
}

function CatalogoVazio() {
  return (
    <section
      aria-labelledby="catalogo-vazio"
      className={cn(
        CARTAO,
        "grid max-w-[640px] justify-items-start gap-3.5 px-[clamp(22px,3.4vw,36px)] py-[clamp(28px,5vw,56px)]"
      )}
    >
      <span className="bg-popover text-ceu grid size-12 place-items-center rounded-full">
        <Library aria-hidden="true" className="size-[22px]" />
      </span>
      <h2
        className="text-titulo text-lg leading-[1.3] font-bold"
        id="catalogo-vazio"
      >
        Nenhum curso no catálogo
      </h2>
      <p className="text-muted-foreground max-w-[52ch]">
        Crie o primeiro curso. Ele nasce em produção: o aluno vê na lista e só
        abre aula quando você publicar.
      </p>
      <Link className={BOTAO} href={NOVO_CURSO}>
        <Plus aria-hidden="true" className="size-4" />
        Criar o primeiro curso
      </Link>
    </section>
  );
}

function resumo(cursos: Visao["cursos"]) {
  if (cursos.length === 0) {
    return "Nenhum curso ainda";
  }
  const publicados = cursos.filter((c) => c.status === "publicado").length;
  return [
    plural(cursos.length, "curso", "cursos"),
    plural(publicados, "publicado", "publicados"),
    plural(cursos.length - publicados, "em produção", "em produção"),
  ].join(", ");
}

/**
 * A tela /admin/catalogo: o cabeçalho e a grade. Sem curso, o botão do topo
 * some e fica só o vazio, para a tela ter um botão amarelo só.
 */
export function VisaoDoCatalogo({ visao: { cursos } }: { visao: Visao }) {
  return (
    <>
      <CabecalhoDaPagina
        acao={
          cursos.length > 0 && (
            <Link className={BOTAO} href={NOVO_CURSO}>
              <Plus aria-hidden="true" className="size-4" />
              Novo curso
            </Link>
          )
        }
        resumo={resumo(cursos)}
        titulo="Catálogo"
      />
      {cursos.length === 0 ? (
        <CatalogoVazio />
      ) : (
        <GradeDoCatalogo
          cursos={cursos.map((c) => ({
            cartao: <CartaoDoCurso curso={c} />,
            id: c.id,
            status: c.status,
            titulo: c.titulo,
          }))}
          novo={<AtalhoNovoCurso />}
        />
      )}
    </>
  );
}
