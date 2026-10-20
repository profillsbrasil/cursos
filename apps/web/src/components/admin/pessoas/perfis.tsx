import { PERFIS, type Perfil } from "@cursos/api/dominio/perfil";
import {
  Building2,
  Factory,
  Globe,
  type LucideIcon,
  ShieldCheck,
} from "lucide-react";

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

export const ehPerfil = (texto: unknown): texto is Perfil =>
  typeof texto === "string" && (PERFIS as readonly string[]).includes(texto);

/** Perfil não é estado: contorno sem cor, como o selo de categoria. */
export const seloDoPerfil = (perfil: Perfil): Selo => ({
  classe:
    "bg-transparent text-foreground ring-1 ring-muted-foreground ring-inset",
  icone: SOBRE_O_PERFIL[perfil].icone,
  rotulo: SOBRE_O_PERFIL[perfil].nome,
});

/** O mesmo Céu a 14% do selo da área ao lado da marca. */
export const SELO_DE_ADMIN: Selo = {
  classe: "bg-ceu/14 text-ceu",
  icone: ShieldCheck,
  rotulo: "Admin",
};
