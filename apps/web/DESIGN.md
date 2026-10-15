---
name: Profills Cursos
description: Plataforma de cursos da Profills Brasil, num tema escuro único com a paleta Sol e céu.
colors:
  sol: "#ffcc01"
  sol-hover: "#ffd633"
  ceu: "#aad2ea"
  canela: "#e5977a"
  erro: "#ff8f86"
  sobre-cor: "#22262b"
  titulo: "#f4f5f7"
  texto: "#e9ecef"
  texto-apagado: "#a8acb0"
  fundo: "#1a1d22"
  sidebar: "#282d33"
  sidebar-realce: "#2f343a"
  cartao: "#33383e"
  popover: "#3a3f45"
  borda: "#40454a"
  trilho: "#4d5257"
  contorno-de-campo: "#7a7e83"
  cinza-grafico: "#61656a"
  pagina-do-livro: "#F4F5F7"
typography:
  headline:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(24px, 2.6vw, 32px)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  title-page:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  title-section:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.33
    letterSpacing: "-0.025em"
  title-card:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
  title-block:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.5
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.25
  caption:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.33
  mono:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
rounded:
  dica: "7px"
  item: "10px"
  campo: "12px"
  base: "14px"
  cartao: "20px"
  conta: "22px"
  pilula: "9999px"
spacing:
  vao-do-item: "4px"
  recuo-da-sidebar: "14px"
  secao: "14px"
  lado-recolhido: "40px"
  pagina-x: "clamp(1rem, 4vw, 3rem)"
  pagina-topo: "32px"
  pagina-pe: "64px"
  cartao-interno: "clamp(22px, 3.4vw, 36px)"
components:
  button-primary:
    backgroundColor: "{colors.sol}"
    textColor: "{colors.sobre-cor}"
    typography: "{typography.label}"
    rounded: "{rounded.pilula}"
    padding: "0 18px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.sol-hover}"
    textColor: "{colors.sobre-cor}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.texto}"
    typography: "{typography.label}"
    rounded: "{rounded.pilula}"
    padding: "0 18px"
    height: "44px"
  button-small:
    padding: "0 14px"
    height: "36px"
  card:
    backgroundColor: "{colors.cartao}"
    textColor: "{colors.texto}"
    rounded: "{rounded.cartao}"
    padding: "{spacing.cartao-interno}"
  input:
    backgroundColor: "{colors.fundo}"
    textColor: "{colors.texto}"
    rounded: "{rounded.campo}"
    padding: "0 14px"
    height: "44px"
  badge-status:
    rounded: "{rounded.pilula}"
    padding: "0 10px"
    height: "24px"
    typography: "{typography.caption}"
  nav-item:
    backgroundColor: "transparent"
    textColor: "{colors.texto}"
    rounded: "{rounded.item}"
    padding: "0 11px"
    height: "40px"
  nav-item-hover:
    backgroundColor: "{colors.sidebar-realce}"
    textColor: "{colors.titulo}"
  nav-item-active:
    backgroundColor: "{colors.sol}"
    textColor: "{colors.sobre-cor}"
  nav-item-active-hover:
    backgroundColor: "{colors.sol-hover}"
    textColor: "{colors.sobre-cor}"
  nav-item-soon:
    backgroundColor: "transparent"
    textColor: "{colors.texto-apagado}"
  nav-item-soon-hover:
    backgroundColor: "transparent"
    textColor: "{colors.texto}"
  tooltip:
    backgroundColor: "{colors.titulo}"
    textColor: "{colors.sobre-cor}"
    rounded: "{rounded.dica}"
    padding: "6px 10px"
  sidebar:
    backgroundColor: "{colors.sidebar}"
    width: "15.5rem"
  sidebar-collapsed:
    width: "69px"
---

# Design System: Profills Cursos

## Overview

**Creative North Star: "A sala de estudo com a luz acesa"**

Profills Cursos é uma sala escura e calma onde a luz amarela marca o lugar da pessoa: o link em que ela está, o botão que ela deve apertar, quanto do curso já fez. O fundo é cinza grafite em quatro degraus (fundo, sidebar, cartão, popover), sem preto puro, e o texto é quase branco. Sobre isso entram as três cores da combinação nº 213 de Sanzo Wada: Sol (amarelo damasco), Céu (azul-claro) e Canela. O tom é amigável e alegre sem perder a seriedade técnica de quem fabrica as máquinas que os cursos ensinam.

A densidade é de ferramenta de estudo, não de landing page. O texto corrido fica em 14 px, os títulos de página em 30 px negrito com letra levemente apertada (24 px nas telas de erro e de não encontrado, e de 22 a 30 px no título da aula), e as formas são arredondadas e cheias: cartões de 20 px, botões em pílula, itens de menu de 10 px. A profundidade vem do degrau de tom e de um anel de 1 px, não de sombra. Sombra aparece em quem flutua sobre o conteúdo (menu, barra de salvar presa ao pé), no brilho amarelo do botão principal e da pílula do link ativo sob o cursor e com o foco de teclado, e em três marcas pequenas em repouso: o selo de saldo, o cursor da barra do player e o anel do dia na semana.

A marca é a pena facetada oficial da Profills (azul, vermelho e cinza) sobre um livro de capa dura amarela e páginas claras, com PROFILLS claro e CURSOS em amarelo, na Orbitron em contorno. A marca são os SVG de `public/marca/`, traçados sobre o desenho aprovado, e nunca se redesenha em CSS. O favicon é só a pena.

**Key Characteristics:**
- Tema único, escuro, sem alternância de tema (`color-scheme: dark` fixo).
- Sol é a cor de ação e de "você está aqui"; Céu é a borda do campo focado, informação e conclusão; Canela é calor secundário (sequência, prova, avatar).
- O foco de teclado é o hover de cada controle. Nada desenha contorno nem anel de foco.
- Vermelho só para erro e alerta.
- Cantos generosos e pílulas; nenhum canto vivo em superfície interativa.
- Movimento curto, com ease-out forte, e sempre desligado com movimento reduzido.

## Colors

Grafite em degraus com três cores de Wada usadas como sinal, nunca como fundo de área.

### Primary
- **Sol, amarelo damasco** (`sol`): o botão principal, a pílula do link ativo, o preenchimento das barras de progresso, o botão redondo de play, o saldo de pontos, o segundo verso dos títulos de retomada e, a 14%, o número do módulo aberto no editor do curso. Sob o cursor e com o foco de teclado, o botão e a pílula do link ativo clareiam para `sol-hover`. Texto sobre Sol é sempre `sobre-cor`.

### Secondary
- **Céu, azul-rei pálido** (`ceu`): a borda do campo focado ou sob o cursor, o anel de 1 px das capas de curso sob o cursor e com foco, a seleção de texto, o selo "Concluído", o selo "Em produção" em contorno, o selo da área ("Admin") ao lado da marca, a seta da linha da busca de pessoas sob o cursor e com foco, e ícones informativos como o do próximo nível.

### Tertiary
- **Canela** (`canela`): a chama da sequência de dias, o selo "Falta a prova" e o fundo das iniciais no avatar. A chama só marca a sequência; os pontos da semana em Trocar pontos usam a seta de subida (`TrendingUp`), no selo Sol.

### Neutral
- **Fundo grafite** (`fundo`): o fundo da página e o fundo dos campos de formulário.
- **Grafite da sidebar** (`sidebar`): a sidebar e o fundo atrás das capas.
- **Realce da sidebar** (`sidebar-realce`): o hover dos itens de menu, o cartão Continuar e as placas de saldo no menu da conta.
- **Cartão** (`cartao`): todo cartão de conteúdo.
- **Popover** (`popover`): popovers padrão, o menu da conta, `secondary`, `muted` e `accent` do shadcn, e o selo "Não iniciado".
- **Borda** (`borda`): bordas e o anel de 1 px dos cartões; também a borda da sidebar.
- **Trilho** (`trilho`): o fundo vazio das barras de progresso e a borda do cartão de conta sob o cursor.
- **Contorno de campo** (`contorno-de-campo`): o token `input` do shadcn. Os campos do admin usam `texto-apagado` como borda, para passar de 3:1.
- **Título** (`titulo`): títulos, o texto sob o cursor e com o foco no menu, no módulo da coluna do player e no nome da linha da busca de pessoas, e o fundo da dica (tooltip).
- **Texto** (`texto`): o texto corrido.
- **Texto apagado** (`texto-apagado`): texto secundário, ícones em repouso, borda do botão em contorno e dos campos.
- **Sobre a cor** (`sobre-cor`): o texto escuro sobre Sol, Céu, Canela e sobre a dica clara.
- **Erro** (`erro`): o token `destructive`, um salmão claro legível no escuro.
- **Página do livro** (`pagina-do-livro`): as páginas do livro na marca; só existe dentro do lockup.

### Named Rules
**The Light Marks the Place Rule.** Sol aparece onde a pessoa está ou deve agir: o link ativo, o botão principal, o progresso, o saldo. Cada tela tem um botão principal amarelo por contexto; o resto é contorno.

**The Red Is Only Error Rule.** Vermelho e o salmão `erro` servem só a erro e alerta. Novidade, destaque, progresso e "em breve" usam Sol ou Céu.

**The Dark Text On Color Rule.** Sobre Sol, Céu ou Canela cheios, o texto é `sobre-cor`, nunca branco. Sobre fundo escuro, cor de Wada pode ser texto (Sol, Céu) porque passa de 4,5:1.

## Typography

**Display Font:** Geist (com ui-sans-serif, system-ui)
**Body Font:** Geist (com ui-sans-serif, system-ui)
**Label/Mono Font:** Geist Mono (com ui-monospace), carregada mas rara

**Character:** Uma família só, geométrica e neutra, que deixa a cor falar. A hierarquia vem de peso (400, 500, 600, 700) e de tamanho, com o espaçamento levemente negativo nos títulos.

### Hierarchy
- **Headline** (700, clamp de 24 a 32 px, 1,15 com retomada e 1,25 no banner vazio): o título do banner de retomada em Meus cursos, com o segundo verso em Sol.
- **Title page** (700, 30 px, letra apertada): o `h1` das páginas, sempre em `titulo`. As telas de erro e de não encontrado usam 24 px, e o título da aula vai de 22 a 30 px.
- **Title section** (700, 24 px, 1,33, letra apertada): o `h2` das seções do aluno (as trilhas e os cursos rápidos de Meus cursos, Cursos para trocar e Extrato recente) e do admin (a `Secao` de `admin/partes.tsx`), com o resumo em 14 px à direita. Seção e cartão formam um par fixo: 24 px sobre os 18 px do Title card, razão de 1,33, e 30 px do Title page sobre os 24 px, razão de 1,25. O tamanho sozinho separa os três níveis, sem depender do peso. A Headline do banner de retomada fica fora dessa conta: abaixo de cerca de 920 px de largura o clamp dela para no piso de 24 px e empata com a seção, e o que a separa é o cartão do banner, a entrelinha de 1,15 e o segundo verso em Sol.
- **Title card** (600, 18 px, 1,3): o `h3` do cartão de curso em Meus cursos e do cartão de troca. No mesmo degrau, em 700 e com a mesma entrelinha de 1,3, ficam o título do cartão Sua semana e o do painel vazio, os números de Sua semana e o preço do cartão de troca.
- **Title block** (600, 16 px): o título da coluna do curso no player, o do aviso de comunicado, o do módulo no editor do curso e os valores das placas Saldo e Sequência no menu da conta. "Seu saldo", acima do número grande de Trocar pontos, usa o mesmo degrau em 400.
- **Mono** (Geist Mono): os pontos da linha de status do player ("+10 pts"), em 600 e 16 px.
- **Body** (400, 14 px): texto corrido, células de tabela, campos. Parágrafos longos limitados a 60ch.
- **Label** (600, 13 a 14 px): botões, nomes no menu, rótulos de campo.
- **Caption** (400 ou 600, 12 px): selos de estado, números do cartão de conta, rótulos das placas Saldo e Sequência no menu da conta, "Em breve" no menu, cabeçalho de tabela.

### Named Rules
**The Tabular Numbers Rule.** Todo número que muda ou se compara (pontos, dias, porcentagem, contagem de tabela) usa `tabular-nums`.

**The No Shouting Rule.** Texto em caixa alta existe só no selo da área ao lado da marca (10 px, 600). Nenhum título, rótulo ou linha acima de título usa caixa alta.

## Layout

A casca tem duas colunas: a sidebar à esquerda e o conteúdo. A sidebar aberta tem 15,5rem; recolhida, 69 px, a soma de recuo de 14 px, quadrado de 40 px, recuo de 14 px e a borda de 1 px. O recuo de 14 px vale nos dois modos para o cabeçalho, a lista e o rodapé, e todo ícone fica ancorado à esquerda, nunca centralizado por flex, então nada desliza quando a largura anda.

A sidebar tem três faixas: o cabeçalho de 68 px (lockup, selo da área, botão de recolher), a navegação (itens de 40 px com vão de 4 px) e o rodapé (o Continuar do aluno e o cartão de conta). Pontos e sequência moram só no cartão de conta. O canto direito do topo do conteúdo fica livre para a página.

O conteúdo tem padding lateral fluido (clamp de 1 a 3rem), 32 px no topo e 64 px no pé. Seções se separam por 14 px entre título e cartão. Abaixo de 768 px a sidebar vira gaveta, e o conteúdo ganha uma faixa de topo de 56 px com o botão de menu e o ícone da marca de 30 px. O banner de retomada passa a uma coluna em 760 px, com a capa em cima.

A página da aula lê de cima para baixo: a migalha, o título da aula com a linha do módulo ("Módulo 8 · Pilar Urgência · aula 4 de 8 · 11 min"), o vídeo com os controles e, abaixo deles, Anterior à esquerda e Próxima aula à direita, a 16 px de cada vizinho. O título fica acima do vídeo para ser a primeira coisa que a pessoa lê, numa janela de 710 px de altura inclusive. Anterior e Próxima ficam depois dos controles porque a Próxima acende em Sol quando a aula fica assistida, logo abaixo da linha de status que avisa a conquista, e porque o Tab chega ao player antes de sair da aula. O custo: numa janela de 710 px de altura e 1440 px de largura, o card do player termina em 697 px e Anterior e Próxima começam em 713 px, então a pessoa rola para chegar à Próxima. Num curso de uma aula só não há Anterior nem Próxima, e a navegação some sem deixar vão. Acima de 1080 px a coluna do curso fica à direita, com o topo alinhado ao do título.

## Elevation & Depth

O sistema é plano e em camadas de tom: fundo, sidebar, cartão e popover clareiam em degraus, e cada cartão leva um anel de 1 px em `borda`. Sombra existe para o que flutua sobre o conteúdo, como resposta do botão principal ao cursor e ao foco de teclado, e em três marcas pequenas em repouso: o selo de saldo, o cursor da barra do player (`0 2px 6px rgb(0 0 0 / 0.5)`) e o anel duplo do dia na semana.

### Shadow Vocabulary
- **Brilho do botão** (`box-shadow: 0 6px 18px rgb(255 204 1 / 0.28)`, o token `shadow-brilho`): o botão amarelo e a pílula do link ativo sob o cursor e com o foco de teclado.
- **Brilho do selo de saldo** (`box-shadow: 0 10px 30px rgb(255 204 1 / 0.25)`): o círculo amarelo do saldo em Trocar pontos, junto com o gradiente radial em Sol a 16% no canto do cartão. Os dois só aparecem quando a vitrine da pessoa tem curso trocável, um que ela ainda não alcança; sem ele, o saldo fica plano, porque não há para onde chamar.
- **Flutuante** (`box-shadow: 0 10px 30px rgb(0 0 0 / 0.45)`): a barra de salvar presa ao pé dos editores, com `backdrop-blur`.
- **Menu** (sombra `xl` do Tailwind em preto a 45%): o menu da conta.
- **Anel de conquista** (anel de 3 px em Sol a 35%): o cartão de conta quando o player registra pontos.

### Named Rules
**The Flat At Rest Rule.** Superfície em repouso não tem sombra; ela separa pelo tom e pelo anel de 1 px. A sombra amarela é resposta, não decoração, com uma exceção: o selo de saldo de Trocar pontos, e só enquanto a vitrine tem curso trocável.

## Shapes

Tudo é arredondado e cheio. A escala parte de `--radius` (14 px): dica 7 px, botão de ícone 9 px, item de menu 10 px, campo 12 px, aviso e cartão Continuar 14 px, cartão de conteúdo 20 px, cartão de conta e menu 22 px (`rounded-2xl`, que este tema define como `--radius` mais 8 px, não os 16 px do Tailwind). Botões de texto, selos, barras de progresso, avatar e o botão de play são pílulas ou círculos. A capa dentro de cartão usa 14 px. Linha divisória dentro de cartão vai de borda a borda.

## Components

### Buttons
Cheios e redondos, com o peso no amarelo.
- **Shape:** pílula (raio cheio), 44 px de altura, 18 px de padding lateral, 600 em 14 px, vão de 8 px para ícone.
- **Primary:** Sol com texto `sobre-cor`. É o `BOTAO` de `casca/botoes.ts`, também no banner de Meus cursos, que só acrescenta a largura cheia abaixo de 760 px.
- **Hover / Focus:** sob o cursor e com o foco de teclado, clareia para `sol-hover` e ganha o brilho amarelo (`bg-sol-hover`, `shadow-brilho`). É o mesmo estado: nenhum botão desenha contorno ou anel de foco. Os dois botões amarelos (o `BOTAO`, que a Próxima aula em destaque no player também usa, e o Continuar redondo da sidebar recolhida) seguem a regra.
- **Outline:** fundo transparente, borda em `texto-apagado`, texto `texto`; sob o cursor e com o foco a borda vira `titulo`. É o `BOTAO_CONTORNO`: a borda passa de 3:1 contra o fundo, o que um cinza mais escuro, como o `cinza-grafico`, não faz.
- **Small:** 36 px de altura, 14 px de padding, 13 px.
- **Ícone:** círculo de 40 px (36 px a partir de 768 px), transparente, ícone em `texto-apagado`, fundo `popover` sob o cursor e com o foco.
- **Desligado:** opacidade 50% e cursor proibido, também no estado `data-disabled` do Base UI. O botão com `focusableWhenDisabled` segura o foco e sobe a 80% no foco e sob o cursor, porque o hover dele é neutralizado.

### Chips
- **Selos de estado:** pílula de 24 px, 600 em 12 px, ícone de 12 px (o `Badge` fixa o tamanho com `size-3!`) a 6 px do texto. Concluído em Céu cheio, Em andamento em Sol a 14% com texto Sol, Falta a prova em Canela cheio, Não iniciado em `popover`, Bloqueado e Em produção em contorno de 1 px (`texto-apagado` e Céu). O aluno vê "Em produção" no curso que o admin pôs em produção e no curso publicado ainda sem aula; "Em breve" é só do menu e de "Como ganhar pontos".
- **Selos do admin:** a mesma pílula, com a palavra do admin. Estudando em Sol a 14%, Nunca abriu em `popover`, Concluído, Concluída e Concluiu tudo em Céu cheio, Em produção e Aguardando produção em contorno Céu, Bloqueado e Sem liberação em contorno `texto-apagado`. Quem parou de estudar não ganha selo nem cor: a frase mostra o dia do último estudo. Nenhum selo é vermelho.
- **Número na trilha:** círculo de 24 px em `popover`, 600 em 12 px, à esquerda do título da capa. O `ol` não desenha marcador, então o número fica na árvore de acessibilidade e é ele que o leitor de tela lê; o `ol` leva `role="list"`, porque o WebKit tira o papel de lista de quem não tem marcador.
- **Selo da área:** Céu a 14% com texto Céu, 10 px em caixa alta, encaixado à direita de CURSOS no lockup.

### Cards / Containers
- **Corner Style:** 20 px.
- **Background:** `cartao`, com anel de 1 px em `borda`.
- **Shadow Strategy:** nenhuma em repouso (ver Elevation & Depth).
- **Internal Padding:** fluido, clamp de 22 a 36 px nos cartões grandes; 12 a 20 px em cartões de grade e tabela.
- **Aviso:** Sol a 10% com anel de Sol a 40%, raio de 14 px, padding de 14 px.
- **Trilha em Meus cursos:** um bloco por trilha, com o título uma vez (o `h2` da seção, com a descrição à direita), o resumo (progresso, cursos concluídos e a linha "Agora:") num cartão de largura cheia e as capas da trilha logo abaixo, numeradas na ordem. O resumo não é link: a capa do curso da vez já é, e cada curso tem uma parada de teclado só. Na trilha de um curso só, a linha "Agora:" sai, porque repetiria a única capa. O curso que ainda não abre diz "Abre depois de" e o curso anterior. A trilha sem curso não aparece. Os cursos rápidos vêm depois de todas as trilhas.
- **Comunicado em Meus cursos:** o mais recente que a pessoa pode ver. Com menos de 14 dias corridos de publicado, no dia de São Paulo, ele é uma faixa de 44 px acima das trilhas. Em duas colunas (1181 px ou mais) ela fica 20 px abaixo do banner e de Sua semana, na largura dos dois; em uma coluna ela vem 20 px abaixo do banner e antes de Sua semana, para aparecer mais cedo. Ela tem fundo `cartao` com anel de 1 px em `borda`, raio de 14 px, o megafone em Céu, o título num `h2` em `titulo` 600 de 14 px cortado numa linha e a data curta ("2 de out.") em `texto-apagado`. A faixa é um `details`: o resumo clareia para branco a 8% sob o cursor e com o foco, e aberto ele quebra o título inteiro e mostra o texto com a data longa. Com 14 dias ou mais, o comunicado vira o cartão de 20 px depois dos cursos rápidos, com o círculo Céu do megafone e o título no degrau Title block.
- **Grade de capas em Meus cursos:** colunas de 250 px ou mais, no máximo 3 (`GRADE_CAPAS`), também no esqueleto da página, com a coluna vazia preservada, então uma capa sozinha mede o mesmo que uma de três.

### Inputs / Fields
- **Style:** 44 px, fundo `fundo`, borda de 1 px em `texto-apagado`, raio de 12 px, padding lateral de 14 px, texto de 14 px.
- **Focus:** o campo não tem hover para copiar, então a borda de 1 px vira Céu no foco e sob o cursor, sem contorno. A regra mora no `index.css` e pega pelo `data-slot` do shadcn (input, textarea, select, grupo de input, switch, checkbox, radio); a moldura de campo montada no app leva `data-campo`. O desligado não muda.
- **Error:** a mensagem por campo em `erro`, ligada ao input pelo id. O campo com erro fica com a borda vermelha também no foco e sob o cursor.

### Navigation
- **Itens:** 40 px de altura, raio de 10 px, ícone de 18 px a 11 px da borda, 500 em 14 px. Sob o cursor e com o foco de teclado, fundo `sidebar-realce` e texto e ícone `titulo` em 150 ms.
- **Ativo:** uma pílula amarela inteira atrás do item, pintada pelo token `sidebar-primary`, que é o Sol, com texto e ícone em `sobre-cor` e peso 600. A pílula desliza entre itens com o `m.li` do Motion, dentro de um `LazyMotion` com `domAnimation`, em 180 ms na curva `cubic-bezier(0.23, 1, 0.32, 1)`, sempre pela string `transform` inteira e com `initial={false}`; com movimento reduzido ela salta. Recolhida, a pílula vira o quadrado de 40 px só por CSS, sem deslizar. Sob o cursor e com o foco de teclado no link ativo, a pílula clareia para `sol-hover` e ganha o brilho do botão amarelo em 150 ms; a pílula é irmã do link, e a variante `ativo-aceso` do `index.css` lê o estado dele. O Motion só escreve o `transform`, então o deslize não muda.
- **Em breve:** texto e ícone apagados, "Em breve" em 12 px à direita, sem link. Sob o cursor e com o foco de teclado, o nome e o ícone clareiam para `texto`, sem fundo; o "Em breve" fica apagado.
- **Recolher:** o botão no cabeçalho alterna entre 15,5rem e 69 px. Pelo clique a largura anima em 200 ms com a mesma curva; Ctrl+B e o cookie mudam a largura na hora, e com movimento reduzido nada anima. Recolhido, o botão mostra o ícone da marca e troca para o ícone de abrir sob o cursor ou com foco (sempre, em tela sem hover).
- **Dica:** fundo `titulo`, texto `sobre-cor` 600 em 12 px, raio de 7 px; o texto secundário ("Ctrl B", "Em breve") em `sobre-cor` a 70%. No Mac, a dica do atalho mostra "⌘ B": o servidor escreve "Ctrl B", e o cliente troca depois da hidratação.
- **Celular:** gaveta, com o botão de fechar no cabeçalho e a faixa de topo de 56 px no conteúdo.

### Cartão de conta
O rodapé das duas áreas. Avatar de 36 px (iniciais em Canela), nome em 600 e 14 px, e abaixo o saldo em Sol com estrela e a sequência com chama em Canela, em 12 px. Borda de 1 px em `borda`, raio de 22 px, padding de 8 px; sob o cursor, com o foco de teclado ou com o menu aberto, borda `trilho` e fundo `sidebar-realce`. Recolhido, vira um círculo de 40 px só com o avatar. O menu abre para cima (para a direita quando recolhido) em `popover`, como os outros menus, com raio de 22 px: duas placas (Saldo e Sequência, que levam a Trocar pontos), Minha conta, o link da outra área e Sair.

### Cartão Continuar
Só no aluno, acima do cartão de conta. Fundo `sidebar-realce`, raio de 14 px, padding de 12 px: o botão redondo de 32 px em Sol (play, ou o troféu na prova), o título da aula em 600 e 13 px, a chamada em 12 px e uma barra de progresso de 4 px. Sob o cursor e com o foco de teclado, o fundo vira `popover`. Recolhido, vira o botão redondo de 40 px com dica à direita, que clareia e brilha como o botão principal. Na página para onde aponta, mostra "Assistindo agora" ("Falta só a prova" na prova) e perde o link.

### Barra de progresso
Pílula com trilho em `trilho` e preenchimento em Sol: 10 px no banner, 8 px na troca, 4 px no Continuar e no acompanhamento do admin. No admin, o texto ao lado ("46 de 90 aulas") carrega o número, e a barra fica `aria-hidden`.

### Acompanhamento do admin
Na busca de alunos, cada linha tem a foto, o nome, o e-mail, uma frase de 12 px com os números ("5 liberações · 2 de 5 cursos concluídos · último estudo ontem") e o selo à direita, antes da seta; em container abaixo de 36rem o selo desce para baixo da frase. Na tela de acesso, as liberações são uma lista no cartão da seção: título em 600 e 15 px, tipo em 12 px e o selo numa linha; a frase de 14 px com o "quando" apagado; a barra de 4 px até 32,5rem, com a coluna do número de 5,5rem no mínimo, para as barras da lista terminarem no mesmo ponto; e o rodapé de 12 px com a data ("Liberada em", ou "Trocado por pontos em" na troca). A trilha com mais de um curso troca a barra por uma lista ordenada em `fundo`, raio de 14 px e anel de 1 px, com o número num círculo de 22 px (Céu cheio no concluído, Sol no curso da vez, `popover` nos outros). Revogar fica à direita; em container abaixo de 36rem, desce para o pé do item. As revogadas ficam num `details` fechado no fim do cartão. Em Liberar trilha e Liberar curso, o botão ou o selo "Liberado" fica na coluna da direita em lista de 32rem ou mais, também quando os selos da linha quebram; mais estreita, a linha quebra como texto. "Em produção" ali é o mesmo selo da lista de liberações, em contorno Céu com o relógio.

### Editor do curso
Um curso real tem 16 módulos e 90 aulas, então cada módulo é um bloco recolhido por padrão, e só abre o que o admin abriu, o módulo novo, o destino de uma aula movida e o módulo com campo marcado.
- **Cabeçalho do bloco:** a linha de resumo é o botão que abre e fecha. O número fica num círculo de 28 px, em `popover` no fechado, Sol a 14% com texto Sol no aberto e contorno de 1 px em `erro` com texto `erro` quando há campo marcado. O título vai em 600 e 16 px, quebra linha abaixo de 768 px e corta com reticências acima. Embaixo, em 12 px, aulas, duração e nível separados por "·", o selo "N aulas assistidas" em `popover` com o olho em Céu e, com erro, "N campos para corrigir" em `erro`. A seta à direita vira ao abrir, sem animação. Aberto, o cabeçalho e os campos do módulo dividem uma faixa de `muted` a 30%. Nenhum erro fica num bloco fechado: o erro de leitura que aparece quando o admin sai do campo e o do Salvar recusado abrem o bloco e marcam o número no índice. A recusa do servidor marca o endereço ou o código, que ficam fora dos blocos. Com erro na tela o bloco não fecha, e o botão fica `aria-disabled`.
- **Campos do módulo aberto:** a largura do bloco decide a grade, não a da janela, porque a sidebar aberta tira 248 px. Com 672 px de bloco ou mais, número (96 px), título e nível (256 px) dividem a linha; de 384 a 672 px, o nível desce para a linha de baixo; abaixo de 384 px, cada campo tem a linha inteira.
- **Índice dos módulos:** preso ao topo da seção a 12 px, entre o título e o cartão, com raio de 20 px, `cartao` a 95%, `backdrop-blur` e anel de 1 px em `borda`, sem sombra, porque fica em repouso quando a página está no topo. "Ir para" em 12 px e um círculo de 36 px por módulo, com o número e as cores do cabeçalho; o fechado vai para `trilho` sob o cursor. A dica mostra o título. Abaixo de 768 px a fila rola por dentro, com a borda direita esmaecida por máscara de 40 px e 44 px de recuo no fim, para o último número sair inteiro; acima, quebra linha. A altura do índice, uma ou duas linhas, vira o `scroll-padding-top` da página: o salto e o foco do teclado param 12 px abaixo dele. O salto não rola suave, porque vem do teclado tanto quanto do mouse.
- **Aula assistida:** no lugar da lixeira, o olho em Céu, um botão de 40 px (36 px a partir de 768 px) que não remove nada. A dica e o leitor de tela dizem quantos alunos assistiram e que dá para trocar o vídeo e o título.

### Foco de teclado
**The Focus Is The Hover Rule.** O foco de teclado é o hover de cada controle: o botão amarelo e a pílula do link ativo clareiam e brilham, o botão de ícone ganha o fundo `popover`, o item de menu ganha o `sidebar-realce`, o item "Em breve" clareia o nome e o ícone, o cartão de curso e de trilha troca o anel de 1 px por Céu, e o campo ganha a borda Céu. Nenhum controle desenha contorno nem anel de foco, também no alto contraste do Windows (`forced-colors`), por decisão do dono.
- **Mecanismo:** a variante `hover:` do `globals.css` também casa com `:focus-visible` e com o label ou o polegar do slider que envolve o input focado; a variante `focus-visible:` não casa com nada, e `--ring` e `--sidebar-ring` são transparentes. O `index.css` apaga o contorno de todo `:focus-visible`.
- **Polegar:** a barra de posição e o volume do player crescem o polegar para 1,25 no foco e sob o cursor.
- **Navegação:** o link ativo acende a pílula amarela, e o "Em breve" clareia o nome e o ícone (ver Navigation).
- **Módulo da coluna do player:** o `summary` ganha fundo branco a 8% e o título clareia para `titulo`.
- **Cabeçalho do módulo no editor do curso:** o mesmo fundo branco a 8%, e o título e a seta clareiam para `titulo`. No índice, o círculo fechado ganha fundo `trilho` e texto `titulo`, e o aberto passa a Sol a 24%.
- **Linha da busca de pessoas:** o fundo `muted` a 40%, o nome em `titulo` e a seta em Céu.
- **Revogadas da tela de acesso:** o `summary` ganha fundo branco a 8% e o texto clareia para `titulo`, como o módulo da coluna do player.
- **Anterior e Próxima do player:** são o `BOTAO_CONTORNO` e, com a aula assistida, o `BOTAO` de `casca/botoes.ts`, então seguem o Outline e o Primary.

## Do's and Don'ts

### Do:
- **Do** usar Sol para o botão principal e para o link ativo, com texto `sobre-cor`.
- **Do** dar um hover a todo controle, porque o foco de teclado é o hover. Campo e controle sem hover ganham a borda Céu pelo `data-slot`, e moldura própria leva `data-campo`.
- **Do** separar superfícies pelo degrau de tom e pelo anel de 1 px em `borda`.
- **Do** usar raio de 20 px em cartões e pílula em botões, selos e barras.
- **Do** desligar toda transição e animação com `prefers-reduced-motion`, e não animar o que a pessoa dispara pelo teclado (Ctrl+B).
- **Do** usar a curva `cubic-bezier(0.23, 1, 0.32, 1)` e durações de 150 a 200 ms na interface.
- **Do** usar a marca pelos arquivos de `public/marca/` e o nome por `lib/marca.ts`.

### Don't:
- **Don't** usar vermelho ou `erro` para destaque, novidade ou progresso.
- **Don't** pôr texto branco sobre Sol, Céu ou Canela cheios.
- **Don't** criar tema claro nem alternância de tema.
- **Don't** pôr sombra em cartão em repouso.
- **Don't** redesenhar a pena ou o livro em CSS ou em SVG à mão no componente, nem usar o livro no favicon.
- **Don't** pôr pontos ou sequência fora do cartão de conta na casca, nem ocupar o canto direito do topo com peça da casca.
- **Don't** usar caixa alta ou linha acima de título fora do selo da área.
- **Don't** escrever `focus-visible:`, `outline-*` ou anel para marcar o foco; o estado de foco se escreve com `hover:`. Os dois `foco.test.ts` acusam a volta.
