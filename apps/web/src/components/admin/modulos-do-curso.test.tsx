import { describe, expect, test } from "bun:test";
import { documentoDeExemplo, EDICAO } from "@cursos/api/dominio/exemplo";
import type { Versao, VideoId } from "@cursos/api/dominio/tipos";
import { renderToStaticMarkup } from "react-dom/server";

import { ErrosDoEditor } from "./erros-do-editor";
import { BlocoDoModulo, ModulosDoCurso } from "./modulos-do-curso";
import { ID, lerRascunho, rascunhoDoCurso } from "./rascunho-do-curso";
import {
  type Bloco,
  NADA_ESCOLHIDO,
  NENHUM_ABERTO,
  type RascunhoDoEditor,
  rascunhoDoEditor,
  rascunhoDoEditorEm,
  telaDo,
} from "./rascunho-do-editor";

const BOTAO = /<button[^>]*>[\s\S]*?<\/button>/g;

const botao = (html: string, rotulo: string) => {
  const achado = html.match(BOTAO)?.find((b) => b.includes(rotulo));
  if (!achado) {
    throw new Error(`sem botão "${rotulo}"`);
  }
  return achado;
};

/** O texto que a página mostra, sem o que só o leitor de tela ouve. */
const textoVisivel = (html: string) =>
  html
    .replace(/<span class="sr-only"[^>]*>[^<]*<\/span>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");

const tagDoId = (html: string, id: string) =>
  html.match(new RegExp(`<[^>]*id="${id}"[^>]*>`))?.[0] ?? "";

const nada = () => undefined;
const LINHA_FECHADA = { chave: null, fechar: nada, pedir: nada };

const blocoDoExemplo = (bloco: Bloco) => {
  const { modulos, niveis } = rascunhoDoCurso(documentoDeExemplo());
  return renderToStaticMarkup(
    <BlocoDoModulo
      assistidasPorAula={{ [EDICAO.A1]: 3 }}
      bloco={bloco}
      despachar={nada}
      escolhas={NADA_ESCOLHIDO}
      indice={0}
      linhaAberta={LINHA_FECHADA}
      marcados={new Set()}
      modulo={modulos[0]}
      modulos={modulos}
      niveis={niveis}
    />
  );
};

describe("bloco fechado", () => {
  const html = blocoDoExemplo({ tipo: "fechado" });

  test("mostra só o resumo, sem nenhum campo", () => {
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain("<input");
    expect(html).not.toContain('data-slot="select-trigger"');
  });

  test("o resumo tem o número, o título, as aulas com a duração, o nível e as aulas assistidas", () => {
    const texto = textoVisivel(html);
    for (const trecho of [
      " 0 ",
      "Módulo zero",
      "2 aulas · 10 min · Básico",
      "1 aula assistida",
    ]) {
      expect(texto).toContain(trecho);
    }
  });
});

describe("bloco aberto", () => {
  const html = blocoDoExemplo({ tipo: "aberto" });

  test("mostra os campos do módulo e das aulas", () => {
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain(`id="modulo-${EDICAO.M1}-titulo"`);
    expect(html).toContain(`id="aula-${EDICAO.A1}-duracao"`);
  });

  test("a aula assistida troca a frase da linha por um ícone com a dica", () => {
    expect(textoVisivel(html)).not.toContain("Assistida por");
    expect(tagDoId(html, `aula-${EDICAO.A1}-uso`)).toContain("sr-only");
    const remover = tagDoId(html, `aula-${EDICAO.A1}-remover`);
    expect(remover).toContain('aria-disabled="true"');
    expect(remover).toContain(`aria-describedby="aula-${EDICAO.A1}-uso"`);
    expect(remover).toContain('type="button"');
  });

  test("a aula assistida usa as pessoas, porque o olho é o Publicado do status", () => {
    for (const bloco of [html, blocoDoExemplo({ tipo: "fechado" })]) {
      expect(bloco).toContain("lucide-users");
      expect(bloco).not.toContain("lucide-eye");
    }
  });
});

describe("campo de vídeo da aula salva", () => {
  const documento = documentoDeExemplo();
  const [primeira, ...resto] = documento.modulos[0].aulas;
  documento.modulos[0].aulas = [
    {
      ...primeira,
      video: { id: "aqz-KE-bpKQ" as VideoId, provedor: "youtube" },
    },
    ...resto,
  ];
  const rascunho = rascunhoDoCurso(documento);
  const html = renderToStaticMarkup(
    <BlocoDoModulo
      assistidasPorAula={{}}
      bloco={{ tipo: "aberto" }}
      despachar={nada}
      escolhas={NADA_ESCOLHIDO}
      indice={0}
      linhaAberta={LINHA_FECHADA}
      marcados={new Set()}
      modulo={rascunho.modulos[0]}
      modulos={rascunho.modulos}
      niveis={rascunho.niveis}
    />
  );

  test("o campo mostra o link curto", () => {
    expect(tagDoId(html, `aula-${EDICAO.A1}-video`)).toContain(
      'value="youtu.be/aqz-KE-bpKQ"'
    );
  });

  test("o link curto volta ao mesmo vídeo no documento", () => {
    const lido = lerRascunho(rascunho, { versao: null });
    expect(
      lido.tipo === "lido" ? lido.documento.modulos[0].aulas[0].video : null
    ).toEqual({ id: "aqz-KE-bpKQ" as VideoId, provedor: "youtube" });
  });

  test("o link longo colado e salvo volta ao campo curto, sem deixar o editor sujo", () => {
    const sujo = (e: RascunhoDoEditor) => telaDo(e).sujo;
    const inicio = rascunhoDoEditorEm(documentoDeExemplo("v1" as Versao));
    const colado = rascunhoDoEditor(inicio, {
      id: EDICAO.A1,
      mudanca: { video: "https://www.youtube.com/watch?v=aqz-KE-bpKQ" },
      tipo: "aula_editada",
    });
    const { envio } = telaDo(colado);
    if (envio === null) {
      throw new Error("o rascunho colado não leu");
    }
    const salvo = rascunhoDoEditor(colado, {
      envio,
      tipo: "salvo",
      versao: "v2" as Versao,
    });

    expect(sujo(inicio)).toBe(false);
    expect(sujo(colado)).toBe(true);
    expect(salvo.rascunho.modulos[0]?.aulas[0]?.video).toBe(
      "youtu.be/aqz-KE-bpKQ"
    );
    expect(sujo(salvo)).toBe(false);
  });
});

describe("bloco com erro na tela", () => {
  const html = blocoDoExemplo({ campos: 2, tipo: "com_erro" });

  test("fica aberto, não fecha e diz quantos campos corrigir", () => {
    const cabeca = tagDoId(html, `modulo-${EDICAO.M1}-cabeca`);
    expect(cabeca).toContain('aria-expanded="true"');
    expect(cabeca).toContain('aria-disabled="true"');
    expect(html).toContain(`id="modulo-${EDICAO.M1}-titulo"`);
    expect(textoVisivel(html)).toContain("2 campos para corrigir");
  });
});

describe("Remover módulo com aula assistida", () => {
  const tag = botao(blocoDoExemplo({ tipo: "aberto" }), "Remover módulo");

  test("fica desligado com o motivo ligado", () => {
    expect(tag).toContain('aria-disabled="true"');
    expect(tag).toContain("data-disabled");
    expect(tag).toContain(`aria-describedby="modulo-${EDICAO.M1}-uso"`);
  });

  test("tem o visual de desligado por data-disabled", () => {
    expect(tag).toContain("data-disabled:opacity-50");
    expect(tag).toContain("data-disabled:cursor-not-allowed");
    expect(tag).toContain("data-disabled:hover:border-muted-foreground");
  });
});

describe("lista de módulos fechados", () => {
  const html = renderToStaticMarkup(
    <ModulosDoCurso
      abertos={NENHUM_ABERTO}
      assistidasPorAula={{}}
      despachar={nada}
      escolhas={NADA_ESCOLHIDO}
      linhaAberta={LINHA_FECHADA}
      marcados={new Set()}
      rascunho={rascunhoDoCurso(documentoDeExemplo())}
    />
  );

  test("não põe nenhum campo na página", () => {
    expect(html).not.toContain("<input");
    expect(html).not.toContain('data-slot="select-trigger"');
  });

  test("o índice tem um link por módulo, que aponta para o bloco dele", () => {
    for (const id of [EDICAO.M1, EDICAO.M2]) {
      expect(html).toContain(`href="#modulo-${id}"`);
      expect(html).toContain(`id="modulo-${id}"`);
    }
  });
});

describe("erro num módulo que o admin não abriu", () => {
  const erros = new Map([
    [ID.aula(EDICAO.A3, "duracao"), "Escreva a duração em mm:ss, como 12:30."],
  ]);
  const html = renderToStaticMarkup(
    <ErrosDoEditor value={erros}>
      <ModulosDoCurso
        abertos={NENHUM_ABERTO}
        assistidasPorAula={{}}
        despachar={nada}
        escolhas={NADA_ESCOLHIDO}
        linhaAberta={LINHA_FECHADA}
        marcados={erros}
        rascunho={rascunhoDoCurso(documentoDeExemplo())}
      />
    </ErrosDoEditor>
  );
  const link = (id: string) =>
    html.match(new RegExp(`<a[^>]*href="#modulo-${id}"[^>]*>.*?</a>`))?.[0] ??
    "";

  test("o bloco abre e mostra o campo com a mensagem", () => {
    expect(tagDoId(html, `modulo-${EDICAO.M2}-cabeca`)).toContain(
      'aria-expanded="true"'
    );
    expect(tagDoId(html, `modulo-${EDICAO.M1}-cabeca`)).toContain(
      'aria-expanded="false"'
    );
    expect(tagDoId(html, `aula-${EDICAO.A3}-duracao`)).toContain(
      'aria-invalid="true"'
    );
    expect(html).toContain("Escreva a duração em mm:ss, como 12:30.");
  });

  test("o índice marca o módulo com erro, e só ele", () => {
    expect(link(EDICAO.M2)).toContain("ring-destructive");
    expect(link(EDICAO.M2)).toContain("1 campo para corrigir");
    expect(link(EDICAO.M1)).not.toContain("ring-destructive");
  });
});
