import { ptBR } from "@clerk/localizations";
import type { ClerkProvider } from "@clerk/nextjs";
import type { ComponentProps } from "react";

import { LOCKUP, PRODUTO } from "@/lib/marca";

type Props = ComponentProps<typeof ClerkProvider>;

const BRILHO = "0 6px 18px rgb(255 204 1 / 0.28)";
const TRANSICAO =
  "color 150ms var(--ease-forte), border-color 150ms var(--ease-forte), background-color 150ms var(--ease-forte), box-shadow 150ms var(--ease-forte)";

/**
 * O Clerk desenha borda e anel de foco com box-shadow, em regras como
 * `.cl-internal-x[data-variant][data-color]:focus` (três classes e a pseudo). O
 * `&&&` repete a classe do elemento para a nossa regra empatar ou vencer na
 * especificidade, e ela vem depois na folha. O foco de teclado acende igual ao
 * cursor, como no resto do app (#30), e nada desenha anel.
 */
const forte = (
  repouso: Record<string, unknown>,
  aceso: Record<string, unknown>
) => ({
  "&&&": { boxShadow: "none", transition: TRANSICAO, ...repouso },
  "&&&:hover, &&&:focus": { boxShadow: "none", ...aceso },
});

const PILULA = {
  borderRadius: "999px",
  fontSize: "14px",
  height: "44px",
  maxHeight: "none",
};

const CAMPO = forte(
  {
    ...PILULA,
    backgroundColor: "var(--background)",
    border: "1px solid var(--muted-foreground)",
    paddingInline: "16px",
  },
  { borderColor: "var(--ceu)" }
);

const LINK = forte(
  { color: "var(--ceu)", fontWeight: 600 },
  { color: "var(--titulo)" }
);

// O título fica fora de vista, e não fora da árvore, para o leitor de tela ainda
// anunciar a página.
const FORA_DE_VISTA = {
  clip: "rect(0 0 0 0)",
  height: "1px",
  overflow: "hidden",
  position: "absolute",
  whiteSpace: "nowrap",
  width: "1px",
} as const;

// O login e o cadastro dividem o cartão. Fica fora do tema geral para não mudar
// o <UserProfile> e o <UserButton>.
const CARTAO_DE_ENTRADA = {
  elements: {
    // A primeira tela do login (só ela) tem o logo direto acima do Google. O Clerk
    // marca o passo no cartão: cl-signIn-start, cl-signUp-start, e assim por diante.
    card: {
      "&.cl-signIn-start :is(.cl-headerTitle, .cl-headerSubtitle)":
        FORA_DE_VISTA,
      backgroundColor: "var(--card)",
      boxShadow: "none",
      gap: "18px",
      padding: "28px",
    },
    cardBox: forte(
      {
        backgroundColor: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "24px",
        maxWidth: "400px",
        width: "100%",
      },
      {}
    ),
    dividerLine: { backgroundColor: "var(--border)" },
    footer: { background: "var(--card)" },
    footerActionLink: LINK,
    formButtonPrimary: {
      ...forte(
        {
          ...PILULA,
          backgroundColor: "var(--sol)",
          color: "var(--sobre-cor)",
          fontWeight: 600,
        },
        { backgroundColor: "var(--sol-hover)", boxShadow: BRILHO }
      ),
      "&&&::after": { display: "none" },
    },
    formFieldAction: LINK,
    formFieldInput: {
      ...CAMPO,
      "&::placeholder": { color: "var(--muted-foreground)" },
      // O campo com erro fica vermelho também no foco e sob o cursor.
      '&&&[aria-invalid="true"]': { borderColor: "var(--destructive)" },
    },
    formFieldLabel: {
      color: "var(--titulo)",
      fontSize: "13px",
      fontWeight: 600,
    },
    formResendCodeLink: LINK,
    header: { gap: "4px" },
    headerSubtitle: { color: "var(--muted-foreground)", fontSize: "14px" },
    headerTitle: {
      color: "var(--titulo)",
      fontSize: "22px",
      fontWeight: 700,
      letterSpacing: "-0.025em",
    },
    identityPreviewEditButton: LINK,
    logoBox: { height: "58px", justifyContent: "center", marginBottom: "6px" },
    logoImage: { height: "58px", width: "auto" },
    otpCodeFieldInput: forte(
      {
        backgroundColor: "var(--background)",
        border: "1px solid var(--muted-foreground)",
        borderRadius: "12px",
      },
      { borderColor: "var(--ceu)" }
    ),
    rootBox: { maxWidth: "400px", width: "100%" },
    socialButtonsBlockButton: forte(
      {
        ...PILULA,
        backgroundColor: "transparent",
        border: "1px solid var(--muted-foreground)",
      },
      { backgroundColor: "transparent", borderColor: "var(--titulo)" }
    ),
    socialButtonsBlockButtonText: {
      color: "var(--foreground)",
      fontSize: "14px",
      fontWeight: 600,
    },
  },
  options: {
    logoImageUrl: LOCKUP.src,
    logoPlacement: "inside",
  },
  // Sem anel de foco do Clerk no cartão: o que se foca acende como sob o cursor.
  variables: {
    colorDanger: "#FF8F86",
    colorRing: "transparent",
    fontFamily: "var(--font-geist-sans)",
    fontSize: "14px",
  },
} satisfies NonNullable<Props["appearance"]>["signIn"];

// O app tem um tema só, escuro.
export const APARENCIA_CLERK = {
  signIn: CARTAO_DE_ENTRADA,
  signUp: CARTAO_DE_ENTRADA,
  variables: {
    colorBackground: "#33383E",
    colorBorder: "#40454A",
    colorForeground: "#E9ECEF",
    colorInput: "#1A1D22",
    colorInputForeground: "#E9ECEF",
    colorMutedForeground: "#A8ACB0",
    colorPrimary: "#FFCC01",
    colorPrimaryForeground: "#22262B",
    colorRing: "#AAD2EA",
  },
} satisfies Props["appearance"];

// O nome da instância no Clerk ("cursos") entra nos textos por {{applicationName}};
// o nome que a pessoa lê é o PRODUTO.
const comOProduto: typeof ptBR = JSON.parse(
  JSON.stringify(ptBR).replaceAll("{{applicationName}}", PRODUTO)
);

// O link de entrada (__clerk_ticket). O Clerk procura a recusa da API em
// unstable__errors.<code> e, sem a chave, mostra o long_message dela, em inglês; o
// ptBR não traz esses códigos. O tipo do Clerk não lista os sign_in_token_*, mas
// a leitura é pelo caminho no objeto mesclado: vão por spread, que o TypeScript
// não confere como propriedade a mais. Códigos da doc de erros da Frontend API.
const ERROS_DO_LINK_DE_ENTRADA = {
  sign_in_token_already_used_code:
    "Este link de entrada já foi usado, e cada link vale uma vez só. Entre com seu e-mail ou com o Google.",
  sign_in_token_cannot_be_used_code:
    "Este link de entrada não vale mais. Entre com seu e-mail ou com o Google.",
  sign_in_token_not_in_sign_in_code: "Este link só serve para entrar na conta.",
  sign_in_token_revoked_code:
    "Este link de entrada foi cancelado. Entre com seu e-mail ou com o Google.",
  ticket_expired_code:
    "Este link expirou. Entre com seu e-mail ou com o Google.",
  ticket_invalid_code:
    "Este link não vale mais ou já foi usado. Entre com seu e-mail ou com o Google.",
};

export const TEXTOS_CLERK = {
  ...comOProduto,
  dividerText: "ou com e-mail",
  formFieldInputPlaceholder__emailAddress: "voce@empresa.com.br",
  formFieldInputPlaceholder__firstName: "Seu nome",
  formFieldInputPlaceholder__lastName: "Seu sobrenome",
  formFieldInputPlaceholder__password: "Sua senha",
  formFieldInputPlaceholder__signUpPassword: "Crie uma senha",
  signIn: {
    ...comOProduto.signIn,
    forgotPasswordAlternativeMethods: {
      ...comOProduto.signIn?.forgotPasswordAlternativeMethods,
      title: "Recuperar a senha",
    },
    resetPassword: {
      ...comOProduto.signIn?.resetPassword,
      formButtonPrimary: "Salvar e entrar",
      title: "Crie uma senha nova",
    },
    start: {
      ...comOProduto.signIn?.start,
      actionLink: "Criar conta",
      actionText: "Ainda não tem conta?",
      subtitle: "Use o e-mail da sua conta ou o Google.",
      title: "Entrar",
    },
  },
  signUp: {
    ...comOProduto.signUp,
    start: {
      ...comOProduto.signUp?.start,
      actionLink: "Entrar",
      actionText: "Já tem conta?",
      // A instância do Clerk não pede nome no cadastro: o subtítulo não promete
      // o campo, e diz onde o nome do certificado se acerta.
      subtitle:
        "Use seu e-mail ou o Google. O nome do certificado você confere depois, em Minha conta.",
      title: "Criar sua conta",
    },
  },
  socialButtonsBlockButton: "Continuar com o {{provider|titleize}}",
  unstable__errors: {
    ...comOProduto.unstable__errors,
    passwordComplexity: {
      ...comOProduto.unstable__errors?.passwordComplexity,
      minimumLength: "pelo menos {{length}} caracteres. Uma frase serve",
      sentencePrefix: "A senha precisa ter",
    },
    ...ERROS_DO_LINK_DE_ENTRADA,
  },
} satisfies Props["localization"];
