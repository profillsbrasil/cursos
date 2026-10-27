import { PERFIS, type Perfil } from "@cursos/api/dominio/perfil";
import type { PerfilNaTela } from "@cursos/api/dominio/pessoas";
import { BONUS_DE_FUNCIONARIO } from "@cursos/api/dominio/regras";
import {
  Building2,
  Factory,
  Globe,
  type LucideIcon,
  ShieldCheck,
} from "lucide-react";

import { fmtPts } from "@/lib/formato";

import type { Selo } from "../acompanhamento";

interface SobreOPerfil {
  /** O que a pessoa vê com ele, na ficha. */
  descricao: string;
  icone: LucideIcon;
  nome: string;
  /** O filtro da lista: "Funcionários". */
  plural: string;
}

export const SOBRE_O_PERFIL: Record<Perfil, SobreOPerfil> = {
  cliente: {
    descricao: "Vê os cursos liberados aos clientes, o pós-venda das máquinas.",
    icone: Factory,
    nome: "Cliente",
    plural: "Clientes",
  },
  funcionario: {
    descricao:
      "Vê os cursos liberados aos funcionários. Quem entra com e-mail @profills.com verificado começa aqui.",
    icone: Building2,
    nome: "Funcionário",
    plural: "Funcionários",
  },
  publico: {
    descricao:
      "Vê os cursos liberados ao público aberto. É o perfil de quem cria conta sozinho.",
    icone: Globe,
    nome: "Público aberto",
    plural: "Público aberto",
  },
};

/** Na ordem da ficha e dos filtros. */
export const ORDEM_DOS_PERFIS: readonly Perfil[] = PERFIS;

/** O toast da troca de perfil, com o bônus quando ele nasceu nesta troca. */
export const textoDaTrocaDePerfil = (
  nome: string,
  perfil: Perfil,
  bonus: boolean
) =>
  `${nome} agora é ${SOBRE_O_PERFIL[perfil].nome}.${bonus ? ` +${fmtPts(BONUS_DE_FUNCIONARIO)} de bônus.` : ""}`;

export const ehPerfil = (texto: unknown): texto is Perfil =>
  typeof texto === "string" && (PERFIS as readonly string[]).includes(texto);

/**
 * Perfil não é estado: contorno sem cor, como o selo de categoria. O perfil do
 * cadastro, ainda sem linha no banco e fora dos filtros, vem tracejado e apagado.
 */
export const seloDoPerfil = ({ doCadastro, perfil }: PerfilNaTela): Selo => ({
  classe: doCadastro
    ? "border-dashed border-muted-foreground bg-transparent text-muted-foreground"
    : "bg-transparent text-foreground ring-1 ring-muted-foreground ring-inset",
  icone: SOBRE_O_PERFIL[perfil].icone,
  rotulo: SOBRE_O_PERFIL[perfil].nome,
});

/** O mesmo Céu a 14% do selo da área ao lado da marca. */
export const SELO_DE_ADMIN: Selo = {
  classe: "bg-ceu/14 text-ceu",
  icone: ShieldCheck,
  rotulo: "Admin",
};
