/**
 * Um File de verdade que conta cada leitura do conteúdo, para o teste provar que
 * o arquivo recusado pelo tamanho nunca é lido. Todo método do Blob que lê o
 * conteúdo passa pela contagem; o teste ao lado acusa método do Bun que fique
 * fora dela.
 */
export class ArquivoQueContaAsLeituras extends File {
  lidos = 0;

  override arrayBuffer() {
    this.lidos += 1;

    return super.arrayBuffer();
  }

  override bytes() {
    this.lidos += 1;

    return super.bytes();
  }

  override formData() {
    this.lidos += 1;

    return super.formData();
  }

  override image(options?: Bun.Image.ConstructorOptions) {
    this.lidos += 1;

    return super.image(options);
  }

  override json(): Promise<unknown> {
    this.lidos += 1;

    return super.json();
  }

  override slice(start?: number, end?: number, contentType?: string) {
    this.lidos += 1;

    return super.slice(start, end, contentType);
  }

  override stream() {
    this.lidos += 1;

    return super.stream();
  }

  override text() {
    this.lidos += 1;

    return super.text();
  }
}

/** Os membros do Blob do Bun que não leem o conteúdo. */
export const NAO_LEEM_O_CONTEUDO = new Set([
  "constructor",
  "delete",
  "exists",
  "lastModified",
  "name",
  "size",
  "stat",
  "type",
  "unlink",
  "write",
  "writer",
]);
