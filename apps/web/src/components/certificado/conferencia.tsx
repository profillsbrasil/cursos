import type { CertificadoEmitido } from "@cursos/api/dominio/pagina-do-certificado";
import type { DiaISO } from "@cursos/api/dominio/tipos";
import { Button } from "@cursos/ui/components/button";
import { Input } from "@cursos/ui/components/input";
import { cn } from "@cursos/ui/lib/utils";
import { BadgeCheck, Download, Search } from "lucide-react";
import Form from "next/form";
import Image from "next/image";

import { BOTAO, BOTAO_CONTORNO } from "@/components/casca/botoes";
import { CAMPO } from "@/components/casca/campos";
import { diaCurto, diaEmSaoPaulo } from "@/lib/formato";
import { ICONE, PRODUTO } from "@/lib/marca";
import { caminhoDaConferencia } from "@/lib/rotas";

import { Fatos } from "./fatos";
import { cargaEmHoras } from "./folha";

const CARTAO = "rounded-[20px] bg-card ring-1 ring-border";

export const CORPO_DA_CONFERENCIA =
  "grid justify-items-center px-4 pt-7 pb-12 md:px-8 md:pt-12 md:pb-16";
const NOME = "font-bold text-titulo text-xl leading-[1.3]";

export function ReciboDaConferencia({
  certificado,
  hoje,
}: {
  certificado: CertificadoEmitido;
  hoje: DiaISO;
}) {
  return (
    <>
      <section
        aria-labelledby="certificado-valido"
        className={cn(
          CARTAO,
          "grid w-full max-w-[440px] justify-items-center gap-5 px-[26px] py-7 text-center"
        )}
      >
        <Image alt={PRODUTO} height={84} priority src={ICONE.src} width={84} />
        <h1
          className="inline-flex h-6 items-center gap-1.5 rounded-full bg-ceu px-2.5 font-semibold text-sobre-cor text-xs"
          id="certificado-valido"
        >
          <BadgeCheck aria-hidden="true" className="size-3" strokeWidth={2.4} />
          Certificado válido
        </h1>
        <div>
          <p className="text-muted-foreground">Certificamos que</p>
          <p className={NOME}>{certificado.nome ?? "Nome não disponível"}</p>
          <p className="text-muted-foreground">concluiu o curso</p>
          <p className={NOME}>{certificado.tituloDoCurso}</p>
        </div>
        <Fatos
          className="w-full text-left"
          fatos={[
            [
              "Concluído em",
              diaCurto(diaEmSaoPaulo(certificado.emitidoEm), hoje),
            ],
            ["Carga horária", cargaEmHoras(certificado.horas)],
            ["Código", certificado.codigo],
            ["Emitido por", "Profills Brasil"],
          ]}
        />
        {certificado.nome ? (
          <a
            className={cn(BOTAO_CONTORNO, "w-full")}
            download
            href={`${caminhoDaConferencia(certificado.codigo)}/pdf`}
          >
            <Download aria-hidden="true" />
            Baixar o PDF
          </a>
        ) : (
          <p className="text-pretty text-[13px] text-muted-foreground">
            A conta de quem recebeu o certificado não tem nome na plataforma,
            então esta página não mostra o nome nem o PDF.
          </p>
        )}
      </section>
      <p className="mt-7 max-w-[64ch] text-pretty text-center text-[13px] text-muted-foreground">
        {PRODUTO} é a plataforma de cursos da Profills Brasil.
      </p>
    </>
  );
}

export function ConferirOutro({ digitado }: { digitado: string }) {
  return (
    <Form action="/certificado" className="flex gap-2">
      <label className="sr-only" htmlFor="codigo-do-certificado">
        Código do certificado
      </label>
      <Input
        autoCapitalize="characters"
        autoComplete="off"
        className={cn(CAMPO, "h-11 min-w-0 flex-1 tracking-[0.04em]")}
        defaultValue={digitado}
        id="codigo-do-certificado"
        maxLength={40}
        name="codigo"
        placeholder="7K3M-Q9TD"
        spellCheck={false}
      />
      <Button className={BOTAO} type="submit">
        Conferir
      </Button>
    </Form>
  );
}

export function SemCertificado({ digitado }: { digitado: string | null }) {
  return (
    <section
      aria-labelledby="sem-certificado"
      className={cn(CARTAO, "grid w-full max-w-[520px] gap-[18px] p-7")}
    >
      <div className="flex items-center gap-3.5">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-popover text-muted-foreground">
          <Search aria-hidden="true" className="size-6" />
        </span>
        <div>
          <h1
            className="font-bold text-2xl text-titulo leading-[1.2] tracking-tight"
            id="sem-certificado"
          >
            {digitado
              ? "Nenhum certificado com este código"
              : "Conferir um certificado"}
          </h1>
          {digitado ? (
            <p className="wrap-anywhere text-muted-foreground">
              {digitado} não existe na {PRODUTO}.
            </p>
          ) : null}
        </div>
      </div>
      <p className="text-pretty">
        Confira o código no pé do PDF: são 8 letras e números, como 7K3M-Q9TD.
        Se o certificado foi impresso, o QR leva direto a esta página.
      </p>
      <ConferirOutro digitado={digitado ?? ""} />
    </section>
  );
}
