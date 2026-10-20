// Sem richColors, o toast fica no popover e só o ícone leva a cor da paleta. O
// toastOptions substitui o do packages/ui, então o cn-toast se repete aqui.
export const OPCOES_DO_TOAST = {
  classNames: {
    error: "[&_[data-icon]]:text-destructive",
    success: "[&_[data-icon]]:text-ceu",
    toast: "cn-toast",
  },
};
