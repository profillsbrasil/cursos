/** O texto de um campo do formulário; sem o campo, ou com um arquivo nele, "". */
export function campoDeTexto(dados: FormData, nome: string) {
  const valor = dados.get(nome);
  return typeof valor === "string" ? valor : "";
}
