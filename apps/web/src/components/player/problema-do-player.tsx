import type { EstadoDaSessao } from "@/lib/player/sessao";

const NAO_SALVOU = {
  envio_recusado:
    "Não deu para salvar seu progresso: o servidor recusou o envio. Recarregue a página para continuar contando.",
  sem_acesso:
    "Não deu para salvar seu progresso: este curso não está mais liberado para você.",
  sem_video:
    "Não deu para salvar seu progresso: o vídeo desta aula saiu do ar.",
  sessao_expirada:
    "Não deu para salvar seu progresso: sua sessão expirou. Entre de novo para continuar contando.",
} as const;

const INDISPONIVEL = {
  nao_encontrado: "Este vídeo não foi encontrado no YouTube.",
  outro: "O vídeo não carregou. Recarregue a página para tentar de novo.",
  sem_permissao_de_incorporar:
    "O dono do vídeo não permite tocar o vídeo fora do YouTube.",
} as const;

/** A linha sob a barra, que só existe enquanto há o que dizer. */
export function ProblemaDoPlayer({ estado }: { estado: EstadoDaSessao }) {
  const { envio, reproducao } = estado;
  let alerta: string | null = null;
  if (reproducao.tipo === "indisponivel") {
    alerta = INDISPONIVEL[reproducao.motivo];
  } else if (envio.tipo === "parado") {
    alerta = NAO_SALVOU[envio.motivo];
  }
  if (alerta) {
    return (
      <p className="text-[13px] text-destructive" role="alert">
        {alerta}
      </p>
    );
  }
  const falhando =
    envio.tipo === "esperando_nova_tentativa" ||
    (envio.tipo === "enviando" && envio.falhasSeguidas > 0);
  return falhando ? (
    <p className="text-[13px] text-muted-foreground" role="status">
      Progresso não salvo. Tentando de novo.
    </p>
  ) : null;
}
