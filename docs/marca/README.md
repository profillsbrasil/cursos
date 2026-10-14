# Marca Profills Cursos

A marca da plataforma tem dois desenhos. O ícone é a pena facetada da Profills sobre um livro aberto. O lockup junta o ícone ao texto "PROFILLS" e "CURSOS". O dono escolheu os dois em protótipos lado a lado. O nome do produto e as medidas das imagens moram em `apps/web/src/lib/marca.ts`.

## Desenho

- A pena é o escudo facetado do logo oficial da Profills, nas cores dele: azul-marinho, vermelho e cinza claro, com contorno creme. O contorno separa o azul do fundo escuro do app.
- O livro tem capa dura amarela (#FFCC01, o `sol` do app) e páginas brancas (#F4F5F7, o `titulo`). A pena fica centrada no livro.
- No lockup, "PROFILLS" sai em #F4F5F7 e "CURSOS" embaixo, em #FFCC01, as duas na Orbitron.
- O favicon é só a pena: em 16 px o livro vira um borrão.

## Arquivos

| Arquivo | Medida | Uso |
|---|---|---|
| `apps/web/public/marca/profills-cursos.svg` | `viewBox` 424 × 120 | Lockup da sidebar aberta e da gaveta do celular, exibido com 40 px de altura (`LOCKUP`) |
| `apps/web/public/marca/profills-cursos-icone.svg` | `viewBox` 216 × 216 | Ícone da sidebar recolhida e do topo do celular (`ICONE`) |
| `apps/web/src/app/icon.svg` | `viewBox` 512 × 512 | Favicon (só a pena), pela convenção de arquivo do Next |
| `apps/web/src/app/favicon.ico` | 16, 32 e 48 | Favicon do navegador que não lê SVG, rendido do `icon.svg` |
| `apps/web/src/app/apple-icon.png` | 180 × 180 | Ícone da tela inicial do iOS: o ícone com 136 px de lado sobre #1A1D22 |
| `apps/web/public/favicon/web-app-manifest-192x192.png` e `-512x512.png` | 192 e 512 | Ícones do PWA em `app/manifest.ts`: o ícone com 138 e 368 px de lado sobre #1A1D22 |
| `docs/marca/fontes/orbitron/` | | A Orbitron e a licença dela (`OFL.txt`). Nada no app carrega a fonte |
| `docs/marca/profills.png` e `profills-branco.png` | 1024 × 225 e 314 × 48 | Logo oficial da Profills (do site institucional), guardado como referência. Nada no app o usa |

Os três SVG têm um `<title>` e nenhum `transform`, `<g>`, metadado de editor ou imagem embutida. O lockup e o ícone usam o nome do produto no `<title>`. O favicon usa "Pena da Profills", porque fica em `apps/web/src`, onde o nome mora só em `lib/marca.ts`. Quem descreve a marca para leitor de tela é o `alt` do `<img>`, que lê `PRODUTO`. Os PNG do app são paletados, com até 256 cores.

## Origem

O primeiro desenho saiu do Grok (Imagine), a partir do logo oficial, em PNG. O vetor de hoje foi traçado sobre esse PNG:

- O ícone é o PNG de 216 px traçado pelo potrace, uma camada por tom: 6 tons do livro, empilhados do fundo para a frente, mais a pena. A pena do ícone é a mesma do favicon, posta no lugar por coordenada.
- A pena do favicon foi redesenhada em formas exatas sobre o `icon.png` antigo: 5 facetas, o contorno e o bico. A caixa dela é igual à do PNG.
- O texto do lockup é a Orbitron convertida em contorno, com o kerning da fonte: "PROFILLS" no peso 800 e "CURSOS" no peso 900, com versal de 30 e de 26 unidades. O espaçamento entre letras estica "PROFILLS" de x 162 a x 422, e "CURSOS" recebe o mesmo espaçamento em em. O S final de PROFILLS fica 2 unidades antes da borda direita.
- O ícone entra no lockup em 2/3 do tamanho, subido 11,5 unidades, no lugar do ícone do PNG antigo.
- O `favicon.ico`, o `apple-icon.png` e os dois ícones do PWA são rendidos dos SVG pelo `rsvg-convert` e montados pelo `magick`, com a mesma margem dos PNG anteriores.

## Orbitron e a licença

A Orbitron é de The Orbitron Project Authors (https://github.com/theleagueof/orbitron), sob a SIL Open Font License 1.1, com o nome reservado "Orbitron". O arquivo `Orbitron-VariableFont_wght.ttf` veio de https://github.com/google/fonts/tree/main/ofl/orbitron, e a licença está em `docs/marca/fontes/orbitron/OFL.txt`.

A OFL permite usar a fonte num logo e converter o texto em contorno. O app não distribui a fonte: o lockup leva só os contornos. O nome reservado restringe só quem distribuir uma versão modificada da fonte.

## Quem trocar a arte

- Atualize `LOCKUP` e `ICONE` em `apps/web/src/lib/marca.ts` se o `viewBox` mudar.
- Reposicione o selo "Admin" em `apps/web/src/components/casca/cabecalho-da-casca.tsx`. Ele fica no vão à direita de "CURSOS" por coordenada fixa (`top-[19px] left-[124px]`): com o lockup em 40 px, CURSOS termina em x 117,7 e tem o centro em y 27, e o selo começa 6,3 px depois.
