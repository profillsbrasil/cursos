import type {
  Antecessor,
  AulaId,
  CursoCatalogo,
  CursoId,
  EstadoCurso,
  Historico,
  TrilhaCatalogo,
} from "./tipos";

export interface Progresso {
  feitas: number;
  pct: number;
  total: number;
}

export interface FaixaNivel {
  feitas: number;
  nome: string;
  obtido: boolean;
  ordem: number;
  total: number;
}

const aulasDe = (c: CursoCatalogo) => c.modulos.flatMap((m) => m.aulas);

export function progresso(
  curso: CursoCatalogo,
  assistidas: ReadonlySet<AulaId>
): Progresso {
  const aulas = aulasDe(curso);
  const feitas = aulas.filter((a) => assistidas.has(a.id)).length;
  const total = aulas.length;
  // floor: 199 de 200 mostra 99%, nunca 100% com aula faltando
  return {
    feitas,
    pct: total === 0 ? 0 : Math.floor((feitas * 100) / total),
    total,
  };
}

export function estadoDoCurso(
  curso: CursoCatalogo,
  h: Historico,
  antes: Antecessor
): EstadoCurso {
  const cert = h.certificados.get(curso.id);
  if (cert) {
    // vence aula nova e volta a "em produção"
    return { certificado: cert, tipo: "concluido" };
  }
  const aulas = aulasDe(curso);
  const [primeira] = aulas;
  if (curso.status === "em_producao" || !primeira) {
    // em_breve vence bloqueado
    return { tipo: "em_breve" };
  }
  if (antes.tipo === "na_trilha" && !antes.concluido) {
    return { liberadoPor: antes.curso, tipo: "bloqueado" };
  }
  const proxima = aulas.find((a) => !h.assistidas.has(a.id));
  if (!proxima) {
    return { tipo: "prova" };
  }
  const comecou = aulas.some(
    (a) => h.assistidas.has(a.id) || h.posicoes.has(a.id)
  );
  return comecou
    ? { proximaAula: proxima.id, tipo: "em_andamento" }
    : { primeiraAula: primeira.id, tipo: "nao_iniciado" };
}

// Regra sequencial: dobra a lista em ordem e passa o antecessor adiante.
export function estadosDaTrilha(
  trilha: TrilhaCatalogo,
  h: Historico,
  liberadosDireto: ReadonlySet<CursoId>
): EstadoCurso[] {
  const estados: EstadoCurso[] = [];
  let antes: Antecessor = { tipo: "livre" };
  for (const curso of trilha.cursos) {
    const estado = estadoDoCurso(
      curso,
      h,
      liberadosDireto.has(curso.id) ? { tipo: "livre" } : antes
    );
    estados.push(estado);
    antes = {
      concluido: estado.tipo === "concluido",
      curso: { id: curso.id, titulo: curso.titulo },
      tipo: "na_trilha",
    };
  }
  return estados;
}

export function niveis(
  curso: CursoCatalogo,
  assistidas: ReadonlySet<AulaId>
): { faixas: FaixaNivel[]; proximo: FaixaNivel | null } {
  const faixas = curso.niveis.map((n) => {
    const aulas = curso.modulos
      .filter((m) => m.nivelOrdem === n.ordem)
      .flatMap((m) => m.aulas);
    const feitas = aulas.filter((a) => assistidas.has(a.id)).length;
    return {
      ...n,
      feitas,
      obtido: aulas.length > 0 && feitas === aulas.length,
      total: aulas.length,
    };
  });
  // Nível sem aulas nunca é obtido, então não pode ser o próximo.
  return {
    faixas,
    proximo: faixas.find((f) => f.total > 0 && !f.obtido) ?? null,
  };
}
