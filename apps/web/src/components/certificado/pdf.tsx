import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  Circle,
  Document,
  Font,
  Page,
  Path,
  renderToBuffer,
  Svg,
  Text,
  View,
} from "@react-pdf/renderer";

import { LOCKUP } from "@/lib/marca";

import { FOLHA_EM_PX, type FolhaDoCertificado } from "./medidas-da-folha";

// process.cwd() é apps/web no next dev, no build e no bun test; o trace do build
// leva os arquivos lidos por caminho fixo a partir dele.
const FONTES = join(process.cwd(), "src/components/certificado/fontes");
const MARCA = join(process.cwd(), "public", LOCKUP.src);

Font.register({
  family: "Geist",
  fonts: [
    { fontWeight: 400, src: join(FONTES, "Geist-Regular.ttf") },
    { fontWeight: 500, src: join(FONTES, "Geist-Medium.ttf") },
    { fontWeight: 600, src: join(FONTES, "Geist-SemiBold.ttf") },
    { fontWeight: 700, src: join(FONTES, "Geist-Bold.ttf") },
  ],
});
// Sem isto, o react-pdf hifeniza nome e curso pelas regras do inglês.
Font.registerHyphenationCallback((palavra) => [palavra]);

type Forma =
  | { tipo: "caminho"; d: string; fill: string }
  | { tipo: "circulo"; cx: string; cy: string; fill: string; r: string };

const ELEMENTO = /<(path|circle)\b([^>]*)>/g;
const ATRIBUTO = /([a-z]+)="([^"]*)"/g;
const TAG = /<([a-zA-Z]+)\b[^>]*>/g;
const O_QUE_O_PDF_DESENHA = new Set(["svg", "title", "path", "circle"]);

function formasDoLockup(svg: string): Forma[] {
  for (const [tag, nome = ""] of svg.matchAll(TAG)) {
    if (!O_QUE_O_PDF_DESENHA.has(nome) || tag.includes("transform")) {
      throw new Error(
        `O lockup do PDF desenha só path e circle sem transform, e ${LOCKUP.src} tem ${tag.slice(0, 60)}.`
      );
    }
  }
  return [...svg.matchAll(ELEMENTO)].map(([, tag, atributos = ""]) => {
    const a = Object.fromEntries(
      [...atributos.matchAll(ATRIBUTO)].map(([, atributo, valor]) => [
        atributo,
        valor,
      ])
    );
    return tag === "path"
      ? { d: a.d ?? "", fill: a.fill ?? "", tipo: "caminho" }
      : {
          cx: a.cx ?? "",
          cy: a.cy ?? "",
          fill: a.fill ?? "",
          r: a.r ?? "",
          tipo: "circulo",
        };
  });
}

const LOCKUP_NO_PDF = formasDoLockup(readFileSync(MARCA, "utf8"));

const LARGURA_DO_A4_EM_PT = 841.89;

const pt = (px: number) => (px * LARGURA_DO_A4_EM_PT) / FOLHA_EM_PX.largura;

const { centro, confere, cor, faixa, nome, pe, quem, traco } = FOLHA_EM_PX;

function FolhaEmPdf({ folha }: { folha: FolhaDoCertificado }) {
  return (
    <Page
      orientation="landscape"
      size="A4"
      style={{
        backgroundColor: cor.papel,
        color: cor.tinta,
        fontFamily: "Geist",
        fontSize: pt(FOLHA_EM_PX.frase.tamanho),
      }}
    >
      <View
        style={{
          alignItems: "center",
          backgroundColor: cor.faixa,
          flexDirection: "row",
          height: pt(faixa.altura),
          justifyContent: "space-between",
          paddingHorizontal: pt(faixa.recuo),
        }}
      >
        <Svg
          style={{
            height: pt(faixa.lockup.altura),
            width: pt(faixa.lockup.largura),
          }}
          viewBox={`0 0 ${LOCKUP.largura} ${LOCKUP.altura}`}
        >
          {LOCKUP_NO_PDF.map((f) =>
            f.tipo === "caminho" ? (
              <Path d={f.d} fill={f.fill} key={f.d} />
            ) : (
              <Circle
                cx={f.cx}
                cy={f.cy}
                fill={f.fill}
                key={`${f.cx} ${f.cy} ${f.r}`}
                r={f.r}
              />
            )
          )}
        </Svg>
        <Text
          style={{
            color: cor.faixaTexto,
            fontSize: pt(faixa.rotulo),
            fontWeight: 500,
            lineHeight: FOLHA_EM_PX.entrelinha,
          }}
        >
          {folha.rotulo}
        </Text>
      </View>
      <View
        style={{
          alignItems: "center",
          bottom: pt(centro.pe),
          justifyContent: "center",
          left: pt(centro.lado),
          position: "absolute",
          right: pt(centro.lado),
          textAlign: "center",
          top: pt(centro.topo),
        }}
      >
        <Text
          style={{
            color: cor.tintaClara,
            fontSize: pt(FOLHA_EM_PX.abre),
            fontWeight: 600,
            lineHeight: FOLHA_EM_PX.entrelinha,
          }}
        >
          Certificamos que
        </Text>
        <Text
          style={{
            fontSize: pt(folha.nomeEmTamanho),
            fontWeight: 700,
            letterSpacing: pt(folha.nomeEmTamanho * nome.espacamento),
            lineHeight: nome.entrelinha,
            marginTop: pt(nome.acima),
          }}
        >
          {folha.nome}
        </Text>
        <View
          style={{
            backgroundColor: cor.traco,
            borderRadius: pt(traco.altura),
            height: pt(traco.altura),
            marginBottom: pt(traco.abaixo),
            marginTop: pt(traco.acima),
            width: pt(traco.largura),
          }}
        />
        <Text
          style={{
            color: cor.tintaClara,
            lineHeight: FOLHA_EM_PX.frase.entrelinha,
          }}
        >
          concluiu o curso
        </Text>
        <Text
          style={{
            fontSize: pt(folha.cursoEmTamanho),
            fontWeight: 700,
            letterSpacing: pt(
              folha.cursoEmTamanho * FOLHA_EM_PX.curso.espacamento
            ),
            lineHeight: FOLHA_EM_PX.entrelinha,
            marginBottom: pt(FOLHA_EM_PX.curso.abaixo),
            marginTop: pt(FOLHA_EM_PX.curso.acima),
          }}
        >
          {folha.curso}
        </Text>
        <Text
          style={{
            color: cor.tintaClara,
            lineHeight: FOLHA_EM_PX.frase.entrelinha,
          }}
        >
          com carga horária de{" "}
          <Text style={{ color: cor.tinta, fontWeight: 700 }}>
            {folha.carga}
          </Text>
          , em {folha.data}.
        </Text>
      </View>
      <View
        style={{
          alignItems: "flex-end",
          borderTopColor: cor.linha,
          borderTopWidth: pt(1),
          bottom: pt(pe.baixo),
          flexDirection: "row",
          justifyContent: "space-between",
          left: pt(pe.lado),
          paddingTop: pt(pe.acima),
          position: "absolute",
          right: pt(pe.lado),
        }}
      >
        <View
          style={{
            color: cor.tintaClara,
            fontSize: pt(quem.texto),
            lineHeight: quem.entrelinha,
          }}
        >
          <Text
            style={{
              color: cor.tinta,
              fontSize: pt(quem.emissor),
              fontWeight: 600,
              lineHeight: quem.entrelinha,
            }}
          >
            {folha.emissor}
          </Text>
          <Text>{folha.plataforma}</Text>
        </View>
        <View
          style={{
            alignItems: "center",
            flexDirection: "row",
            gap: pt(confere.vao),
          }}
        >
          <View
            style={{
              alignItems: "flex-end",
              color: cor.tintaClara,
              fontSize: pt(confere.texto),
              lineHeight: confere.entrelinha,
            }}
          >
            <Text>Código</Text>
            <Text
              style={{
                color: cor.tinta,
                fontSize: pt(confere.codigo),
                fontWeight: 700,
                letterSpacing: pt(confere.codigo * confere.espacamentoDoCodigo),
                lineHeight: confere.entrelinha,
              }}
            >
              {folha.codigo}
            </Text>
            <Text>{folha.confira}</Text>
          </View>
          <Svg
            style={{ height: pt(confere.qr), width: pt(confere.qr) }}
            viewBox={`0 0 ${folha.qr.lado} ${folha.qr.lado}`}
          >
            <Path d={folha.qr.caminho} fill={cor.tinta} />
          </Svg>
        </View>
      </View>
    </Page>
  );
}

export function pdfDaFolha(folha: FolhaDoCertificado): Promise<Buffer> {
  return renderToBuffer(
    <Document
      author={folha.emissor}
      language="pt-BR"
      subject={`${folha.nome} concluiu o curso ${folha.curso}.`}
      title={`Certificado ${folha.codigo}`}
    >
      <FolhaEmPdf folha={folha} />
    </Document>
  );
}
