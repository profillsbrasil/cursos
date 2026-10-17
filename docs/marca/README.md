# Marca Profills Cursos

A marca da plataforma é o cubo em camadas da Profills, com uma seta saindo da camada do meio. É o símbolo da Profills School, o Moodle que a empresa usaria antes de construir os próprios cursos, recolorido nas cores do app. O lockup junta o cubo ao texto "PROFILLS" e "CURSOS". O dono escolheu a versão entre seis protótipos lado a lado. O nome do produto e as medidas das imagens moram em `apps/web/src/lib/marca.ts`.

## Desenho

- O cubo tem um losango no topo e três lajes empilhadas. A laje do meio continua para a direita na seta.
- Cada camada leva uma das três cores de Wada do app: Céu em cima, Sol no meio e Canela embaixo. Em cada laje, a face da direita tem a cor do app e a da esquerda, um tom mais escuro dela. O losango do topo é o Céu clareado.

| Face | Cor |
|---|---|
| Losango do topo | #D4E8F4 |
| Laje de cima, esquerda e direita | #7BB5DD e #AAD2EA (`ceu`) |
| Laje do meio, esquerda e direita com a seta | #E0A800 e #FFCC01 (`sol`) |
| Laje de baixo, esquerda e direita | #C9785C e #E5977A (`canela`) |

- No lockup, "PROFILLS" sai em #F4F5F7 e "CURSOS" embaixo, em #FFCC01, as duas na Orbitron.
- O favicon é o mesmo cubo: em 16 px as três camadas ainda se separam por 1 px de vão.

## Arquivos

| Arquivo | Medida | Uso |
|---|---|---|
| `apps/web/public/marca/profills-cursos.svg` | `viewBox` 424 × 120 | Lockup da sidebar aberta, da gaveta do celular e do certificado, exibido com 40 px de altura na casca (`LOCKUP`) |
| `apps/web/public/marca/profills-cursos-icone.svg` | `viewBox` 216 × 216 | Ícone da sidebar recolhida, do topo do celular e da conferência do certificado (`ICONE`) |
| `apps/web/src/app/icon.svg` | `viewBox` 512 × 512 | Favicon, pela convenção de arquivo do Next |
| `apps/web/src/app/favicon.ico` | 16, 32 e 48 | Favicon do navegador que não lê SVG, rendido do `icon.svg` |
| `apps/web/src/app/apple-icon.png` | 180 × 180 | Ícone da tela inicial do iOS: o ícone com 136 px de lado sobre #1A1D22 |
| `apps/web/public/favicon/web-app-manifest-192x192.png` e `-512x512.png` | 192 e 512 | Ícones do PWA em `app/manifest.ts`: o ícone com 138 e 368 px de lado sobre #1A1D22 |
| `docs/marca/cubo.ts` | | As faces do cubo e o gerador dos três SVG |
| `docs/marca/fontes/orbitron/` | | A Orbitron e a licença dela (`OFL.txt`). Nada no app carrega a fonte |
| `docs/marca/profills.png` e `profills-branco.png` | 1024 × 225 e 314 × 48 | Logo oficial da Profills (do site institucional), guardado como referência. Nada no app o usa |

Os três SVG têm um `<title>` e só `path` com `fill`, sem `transform`, `<g>`, metadado de editor ou imagem embutida: o PDF do certificado desenha o lockup forma por forma e recusa outra tag. O lockup e o ícone usam o nome do produto no `<title>`. O favicon usa "Cubo da Profills", porque fica em `apps/web/src`, onde o nome mora só em `lib/marca.ts`. Quem descreve a marca para leitor de tela é o `alt` do `<img>`, que lê `PRODUTO`. Os PNG do app são paletados, com até 256 cores.

## Origem

O símbolo veio do login do Moodle da Profills School (`simbolo-profills-school0.png` e o logo de 3285 × 800). O Grok (Imagine) gerou seis recolorações dele nas cores do app, e o dono escolheu a de uma cor por camada. O vetor não é traço do PNG gerado:

- A silhueta do símbolo original passou pelo potrace com `--alphamax 0`, que devolve só retas. Dos vértices saíram as medidas, acertadas à mão para a geometria ficar exata: a aresta da frente em x 269, a inclinação de 0,525 nos dois lados, lajes de 99 unidades e vãos de 42. A seta mantém a ponta do original, um pouco acima do eixo da laje.
- `bun docs/marca/cubo.ts apps/web`, rodado da raiz do repo, escreve o ícone e o favicon, com o cubo centrado e 2 unidades de folga nas laterais, e troca o cubo do lockup, que ocupa a altura toda à esquerda. O texto do lockup fica como está: o gerador guarda os dois `path` que começam depois de x 150.
- O texto do lockup é a Orbitron convertida em contorno, com o kerning da fonte: "PROFILLS" no peso 800 e "CURSOS" no peso 900, com versal de 30 e de 26 unidades. O espaçamento entre letras estica "PROFILLS" de x 162 a x 422, e "CURSOS" recebe o mesmo espaçamento em em.
- O `favicon.ico`, o `apple-icon.png` e os dois ícones do PWA saem dos SVG por `bash docs/marca/rasters.sh apps/web`, rodado da raiz do repo. O script usa o `rsvg-convert` e o `magick`, mantém a margem dos PNG anteriores e gera os mesmos bytes a cada execução. Quem mudar `cubo.ts` roda os dois comandos, nessa ordem.

## Orbitron e a licença

A Orbitron é de The Orbitron Project Authors (https://github.com/theleagueof/orbitron), sob a SIL Open Font License 1.1, com o nome reservado "Orbitron". O arquivo `Orbitron-VariableFont_wght.ttf` veio de https://github.com/google/fonts/tree/main/ofl/orbitron, e a licença está em `docs/marca/fontes/orbitron/OFL.txt`.

A OFL permite usar a fonte num logo e converter o texto em contorno. O app não distribui a fonte: o lockup leva só os contornos. O nome reservado restringe só quem distribuir uma versão modificada da fonte.

## Quem trocar a arte

- Mude as faces em `docs/marca/cubo.ts` e rode o gerador e o `rasters.sh`.
- Atualize `LOCKUP` e `ICONE` em `apps/web/src/lib/marca.ts` se o `viewBox` mudar.
- Reposicione o selo "Admin" em `apps/web/src/components/casca/cabecalho-da-casca.tsx`. Ele fica no vão à direita de "CURSOS" por coordenada fixa (`top-[19px] left-[124px]`): com o lockup em 40 px, CURSOS termina em x 117,7 e tem o centro em y 27, e o selo começa 6,3 px depois.
