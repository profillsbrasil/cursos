// Server Component: a opção Convidados da tela Pessoas. Só o convite vivo chega
// aqui; o aceito virou Pessoa e aparece nas outras opções.

import type { PainelDeConvites } from "@cursos/api/dominio/convite";

import { fmtNum } from "@/lib/formato";

import { SecaoSobABarra, Vazio } from "../partes";
import { LinhasDosConvidados } from "./linha-do-convidado";

export function ListaDeConvidados({
  convites,
  termo,
}: {
  convites: PainelDeConvites;
  termo: string;
}) {
  const { convidados, hoje, total } = convites;
  const cortada = !termo && total > convidados.length;
  return (
    <SecaoSobABarra
      id="convidados"
      titulo={termo ? `Convidados para "${termo}"` : "Convidados"}
    >
      {convidados.length === 0 ? (
        <Vazio>
          {termo
            ? `Nenhum convite pendente com "${termo}" no e-mail.`
            : "Nenhum convite pendente. Use o botão Convidar para chamar alguém."}
        </Vazio>
      ) : (
        <>
          <LinhasDosConvidados convidados={convidados} hoje={hoje} />
          {cortada ? (
            <p className="border-border border-t px-5 py-3.5 text-muted-foreground">
              Mostrando os {fmtNum(convidados.length)} mais recentes. Busque
              pelo e-mail para achar quem falta.
            </p>
          ) : null}
        </>
      )}
    </SecaoSobABarra>
  );
}
