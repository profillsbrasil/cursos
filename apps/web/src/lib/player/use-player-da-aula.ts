"use client";

import type { Conquista, Pedido } from "@cursos/api/dominio/registro";
import type { AulaId, VideoDaAula } from "@cursos/api/dominio/tipos";
import type { Trechos } from "@cursos/api/dominio/trechos";
import { TRPCClientError } from "@trpc/client";
import { useRouter } from "next/navigation";
import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { trpcClient } from "@/utils/trpc";
import {
  criarSessaoComPreferencias,
  PREFERENCIAS_PADRAO,
} from "./preferencias";
import {
  type EstadoDaSessao,
  estadoInicial,
  motivoParadoDe,
  type RespostaDoEnvio,
  type SessaoDeEstudo,
} from "./sessao";
import { type ComandoDoTeclado, comandoDaTecla } from "./teclado";
import { criarPlayerDeVideo } from "./video";

export interface EntradaDoPlayer {
  aulaId: AulaId;
  duracaoSeg: number;
  estudo: { assistida: boolean; trechos: Trechos };
  inicioSeg: number;
  video: VideoDaAula;
}

async function enviarRegistro(
  aulaId: AulaId,
  pedido: Pedido
): Promise<RespostaDoEnvio> {
  try {
    const registro = await trpcClient.aula.registrar.mutate({
      aulaId,
      posicaoSeg: pedido.posicaoSeg,
      trechos: [...pedido.trechos],
    });
    return { registro, tipo: "ok" };
  } catch (e) {
    const motivo =
      e instanceof TRPCClientError
        ? motivoParadoDe(String(e.data?.code))
        : undefined;
    return motivo ? { motivo, tipo: "definitivo" } : { tipo: "rede" };
  }
}

const nada = () => () => undefined;

function teclaDoControle(e: KeyboardEvent, container: HTMLElement) {
  const alvo = e.target as HTMLElement;
  if (alvo === container) {
    return false;
  }
  if (e.key === " " || e.key === "Enter") {
    return alvo.closest("button, a, input") !== null;
  }
  return alvo.closest("[data-slot=slider]") !== null;
}

export function usePlayerDaAula(entrada: EntradaDoPlayer) {
  const router = useRouter();
  const refVideo = useRef<HTMLDivElement>(null);
  const refContainer = useRef<HTMLElement>(null);
  const [inicial] = useState(entrada);
  // O servidor não lê localStorage: o snapshot antes da sessão usa o padrão.
  const [estadoAntes] = useState(() =>
    estadoInicial({ ...inicial, preferencias: PREFERENCIAS_PADRAO })
  );
  const [sessao, setSessao] = useState<SessaoDeEstudo | null>(null);
  const [conquista, setConquista] = useState<Conquista | null>(null);
  const [telaCheia, setTelaCheia] = useState(false);
  const [podeTelaCheia, setPodeTelaCheia] = useState(false);

  useEffect(() => {
    const elemento = refVideo.current;
    if (!elemento) {
      return;
    }
    const { pararDeGravar, sessao: s } = criarSessaoComPreferencias(inicial, {
      agendar: (fn, ms) => {
        const id = window.setTimeout(fn, ms);
        return () => window.clearTimeout(id);
      },
      aoConquistar: (c) => {
        setConquista(c);
        startTransition(() => router.refresh());
      },
      criarPlayer: (o) => criarPlayerDeVideo(inicial.video, elemento, o),
      enviar: (pedido) => enviarRegistro(inicial.aulaId, pedido),
      relogio: () => performance.now(),
    });
    setSessao(s);
    const aoEsconder = () => {
      if (document.visibilityState === "hidden") {
        s.salvarAgora();
      }
    };
    const aoSair = () => s.salvarAgora();
    document.addEventListener("visibilitychange", aoEsconder);
    window.addEventListener("pagehide", aoSair);
    return () => {
      pararDeGravar();
      document.removeEventListener("visibilitychange", aoEsconder);
      window.removeEventListener("pagehide", aoSair);
      s.encerrar();
    };
  }, [inicial, router]);

  useEffect(() => {
    const container = refContainer.current;
    setPodeTelaCheia(
      document.fullscreenEnabled &&
        typeof container?.requestFullscreen === "function"
    );
    const aoMudar = () =>
      setTelaCheia(document.fullscreenElement === refContainer.current);
    document.addEventListener("fullscreenchange", aoMudar);
    return () => document.removeEventListener("fullscreenchange", aoMudar);
  }, []);

  const estado: EstadoDaSessao = useSyncExternalStore(
    sessao ? sessao.assinar : nada,
    sessao ? sessao.estado : () => estadoAntes,
    () => estadoAntes
  );

  const comandar = useCallback(
    (c: ComandoDoTeclado) => {
      if (c.tipo === "tela_cheia") {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => undefined);
        } else {
          refContainer.current?.requestFullscreen().catch(() => undefined);
        }
        return;
      }
      sessao?.comandar(c);
    },
    [sessao]
  );

  useEffect(() => {
    const container = refContainer.current;
    if (!container) {
      return;
    }
    const aoTeclar = (e: KeyboardEvent) => {
      const c = comandoDaTecla(e);
      if (!c || teclaDoControle(e, container)) {
        return;
      }
      e.preventDefault();
      comandar(c);
    };
    container.addEventListener("keydown", aoTeclar);
    return () => container.removeEventListener("keydown", aoTeclar);
  }, [comandar]);

  const buscar = useCallback(
    (seg: number) => comandar({ seg, tipo: "buscar" }),
    [comandar]
  );

  return {
    buscar,
    comandar,
    conquista,
    estado,
    podeTelaCheia,
    refContainer,
    refVideo,
    telaCheia,
  };
}
