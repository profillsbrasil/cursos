import { inicioDaAula } from "@cursos/api/dominio/aula";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AulaSemVideo } from "@/components/player/aula-sem-video";
import { ColunaDoCurso } from "@/components/player/coluna-do-curso";
import { PlayerDaAula } from "@/components/player/player-da-aula";
import { QuestionarioDaAula } from "@/components/player/questionario-da-aula";
import { carregarAula } from "@/server/api";

interface Props {
  params: Promise<{ aulaId: string; slug: string }>;
}

async function aulaDaUrl(params: Props["params"]) {
  const { aulaId, slug } = await params;
  return carregarAula(slug, aulaId);
}

// O notFound() aqui também: só assim o Next troca o título pelo do not-found.tsx.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const dados = await aulaDaUrl(params);
  if (!dados) {
    notFound();
  }
  return { title: `${dados.aula.titulo} · ${dados.curso.titulo}` };
}

export default async function PaginaDaAula({ params }: Props) {
  const dados = await aulaDaUrl(params);
  if (!dados) {
    notFound();
  }
  return (
    <div className="grid items-start gap-6 min-[1081px]:grid-cols-[minmax(0,1fr)_360px]">
      <div className="grid min-w-0 gap-6">
        {dados.aula.video ? (
          <PlayerDaAula
            dados={dados}
            inicioSeg={inicioDaAula(dados.estudo, dados.aula.duracaoSeg)}
            key={dados.aula.id}
            video={dados.aula.video}
          />
        ) : (
          <AulaSemVideo dados={dados} />
        )}
        {dados.questionario ? (
          <QuestionarioDaAula
            aulaId={dados.aula.id}
            key={dados.aula.id}
            proxima={dados.proxima}
            questionario={dados.questionario}
            slug={dados.curso.slug}
            temVideo={dados.aula.video !== null}
          />
        ) : null}
      </div>
      <ColunaDoCurso dados={dados} />
    </div>
  );
}
