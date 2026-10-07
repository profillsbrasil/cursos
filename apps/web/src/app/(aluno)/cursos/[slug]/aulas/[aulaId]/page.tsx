import { inicioDaAula } from "@cursos/api/dominio/aula";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { Chips, TopoDoAluno } from "@/components/aluno/topo";
import { AulaSemVideo } from "@/components/player/aula-sem-video";
import { ColunaDoCurso } from "@/components/player/coluna-do-curso";
import { MigalhaDaAula } from "@/components/player/migalha-da-aula";
import { PlayerDaAula } from "@/components/player/player-da-aula";
import { carregarAula, carregarResumo } from "@/server/api";

interface Props {
  params: Promise<{ aulaId: string; slug: string }>;
}

const UUID = z.uuid();

// Id fora do formato é 404, não erro de validação do tRPC.
async function aulaDaUrl(params: Props["params"]) {
  const { aulaId, slug } = await params;
  return UUID.safeParse(aulaId).success ? carregarAula(slug, aulaId) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const dados = await aulaDaUrl(params);
  return {
    title: dados
      ? `${dados.aula.titulo} · ${dados.curso.titulo}`
      : "Aula · Profills School",
  };
}

export default async function PaginaDaAula({ params }: Props) {
  const [dados, resumo] = await Promise.all([
    aulaDaUrl(params),
    carregarResumo(),
  ]);
  if (!dados) {
    notFound();
  }
  return (
    <>
      <TopoDoAluno
        chips={<Chips resumo={resumo} />}
        esquerda={<MigalhaDaAula dados={dados} />}
      />
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
    </>
  );
}
