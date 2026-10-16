import { inicioDaAula } from "@cursos/api/dominio/aula";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AulaSemVideo } from "@/components/player/aula-sem-video";
import { ColunaDoCurso } from "@/components/player/coluna-do-curso";
import { PlayerDaAula } from "@/components/player/player-da-aula";
import { carregarAula } from "@/server/api";

interface Props {
  params: Promise<{ aulaId: string; slug: string }>;
}

async function aulaDaUrl(params: Props["params"]) {
  const { aulaId, slug } = await params;
  return carregarAula(slug, aulaId);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const dados = await aulaDaUrl(params);
  return {
    title: dados ? `${dados.aula.titulo} · ${dados.curso.titulo}` : "Aula",
  };
}

export default async function PaginaDaAula({ params }: Props) {
  const dados = await aulaDaUrl(params);
  if (!dados) {
    notFound();
  }
  return (
    <div className="grid items-start gap-6 min-[1081px]:grid-cols-[minmax(0,1fr)_360px]">
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
      <ColunaDoCurso dados={dados} />
    </div>
  );
}
