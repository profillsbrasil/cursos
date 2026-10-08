import { COLUNAS_DA_CAPA } from "./comum";

export const COM_CONTEUDO = {
  columns: {
    ...COLUNAS_DA_CAPA,
    codigo: true,
    destaque: true,
    id: true,
    slug: true,
    status: true,
    tema: true,
    titulo: true,
  },
  with: {
    modulos: {
      columns: { nivelOrdem: true, numero: true, titulo: true },
      orderBy: { numero: "asc" },
      with: {
        aulas: {
          columns: {
            duracaoSeg: true,
            id: true,
            posicao: true,
            titulo: true,
            videoId: true,
            videoProvedor: true,
          },
          orderBy: { posicao: "asc" },
        },
      },
    },
    niveis: { columns: { nome: true, ordem: true }, orderBy: { ordem: "asc" } },
  },
} as const;
