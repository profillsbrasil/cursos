# Marca Profills Cursos

A marca da plataforma tem dois desenhos. O ícone é a pena facetada da Profills sobre um livro aberto. O lockup junta o ícone ao texto "PROFILLS" e "CURSOS". O dono escolheu os dois em protótipos lado a lado. O nome do produto e as medidas das imagens moram em `apps/web/src/lib/marca.ts`.

## Desenho

- A pena é o escudo facetado do logo oficial da Profills, nas cores dele: azul-marinho, vermelho e cinza claro, com contorno branco. O contorno separa o azul do fundo escuro do app.
- O livro tem capa dura amarela (#FFCC01, o `sol` do app) e páginas brancas (#F4F5F7, o `titulo`). A pena ocupa 92% da altura do livro e fica centrada nele.
- No lockup, "PROFILLS" sai em branco, numa geométrica larga, e "CURSOS" embaixo, no amarelo.
- O favicon é só a pena: em 16 px o livro vira um borrão.

## Arquivos

| Arquivo | Medida | Uso |
|---|---|---|
| `apps/web/public/marca/profills-cursos.png` | 424 × 120 | Lockup da sidebar aberta, exibido com 40 px de altura (`LOCKUP`) |
| `apps/web/public/marca/profills-cursos-icone.png` | 216 × 216 | Ícone da sidebar recolhida e do topo do celular (`ICONE`) |
| `apps/web/src/app/icon.png` | 512 × 512 | Favicon (só a pena), pela convenção de arquivo do Next |
| `apps/web/src/app/favicon.ico` | 16, 32 e 48 | Favicon para navegador que pede `/favicon.ico` |
| `apps/web/src/app/apple-icon.png` | 180 × 180 | Ícone da tela inicial do iOS, sobre o fundo #1A1D22 |
| `apps/web/public/favicon/web-app-manifest-192x192.png` e `-512x512.png` | 192 e 512 | Ícones do PWA em `app/manifest.ts`, sobre o fundo #1A1D22 |
| `docs/marca/profills.png` e `profills-branco.png` | 1024 × 225 e 314 × 48 | Logo oficial da Profills (do site institucional), guardado como referência. Nada no app o usa |

Todos os PNG do app são paletados, com até 256 cores.

## Origem

O desenho saiu do Grok (Imagine), a partir do logo oficial. A pena e o livro foram gerados em separado e montados com medida exata. O livro foi recolorido por código para o amarelo e o branco do app. O texto do lockup também veio do Grok e foi recolorido para os mesmos tons.

## O que falta

- Uma versão em SVG. O ícone precisa ser redesenhado em vetor por cima do PNG, e o texto do lockup precisa virar uma fonte real.
- Quem trocar a arte do lockup precisa atualizar as medidas de `LOCKUP` e `ICONE` em `apps/web/src/lib/marca.ts`. Também precisa reposicionar o selo "Admin" em `apps/web/src/components/casca/cabecalho-da-casca.tsx`, que fica no vão à direita de "CURSOS" por coordenada fixa (`top-[19px] left-[115px]`).
