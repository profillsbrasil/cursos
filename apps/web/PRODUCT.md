# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Três públicos na mesma plataforma, nesta ordem de chegada:

1. Funcionários da Profills Brasil. É o público do lançamento.
2. Clientes da Profills: as fábricas que compram envasadoras, embaladoras, enfardadeiras e envolvedoras, e as pessoas delas que operam e mantêm as máquinas.
3. Público aberto da indústria de envase e embalagem, sem vínculo com a Profills.

O estudo acontece no computador: no escritório, em horário de trabalho, e em casa, fora do expediente. São sessões de vídeo e leitura, não consulta rápida ao lado da máquina.

## Product Purpose

Ensinar o que a Profills sabe sobre as próprias máquinas, sobre o processo de envase e embalagem, sobre vendas e atendimento e sobre as rotinas internas da empresa. Para o funcionário, a plataforma é a capacitação da empresa. Para o cliente, é parte do pós-venda. Para o público aberto, é um produto pago ou gratuito e uma porta de entrada para a marca.

A métrica de sucesso de cada público ainda não foi definida (ver Decisões abertas).

## Positioning

Quem fabrica e dá assistência às máquinas é quem ensina. Os cursos sobre operação, ajuste, limpeza e manutenção tratam de equipamentos reais da Profills, com o conhecimento da fábrica e do suporte, coisa que uma plataforma genérica de cursos não tem como oferecer.

## Operating Context

- Os alunos assistem a vídeo-aulas gravadas organizadas em módulos, leem material de apoio (apostilas, PDFs, texto na aula), fazem prova no fim do curso e recebem certificado.
- Um mesmo catálogo serve aos três públicos. Cada pessoa vê os cursos liberados para o perfil ou a empresa dela.
- O acesso é misto: curso pago avulso, assinatura, curso gratuito para certos usuários e acesso 100% gratuito para outros.
- A empresa é a Profills Brasil, fabricante de máquinas para produtos líquidos, pastosos e sólidos. O site institucional fica em outro repositório (`site-profills-brasil`).

## Capabilities and Constraints

Confirmado:

- Formatos de aula: vídeo gravado, material para ler, prova e certificado.
- Temas: máquinas da Profills, processo de envase e embalagem, vendas e atendimento, rotinas internas.
- Uma plataforma com controle de acesso por perfil e por empresa cliente. A autenticação é do Clerk e a autorização mora nos procedures do tRPC (ver `CLAUDE.md` da raiz).
- Cobrança em dois modelos: compra avulsa e assinatura, além de liberação gratuita por usuário.

Fora do escopo confirmado:

- Aula ao vivo não entra agora.

Decisões abertas:

- Preços, planos de assinatura e o meio de pagamento.
- Como o acesso gratuito é concedido (por empresa cliente, por compra de máquina, por convite).
- Quando os clientes e o público aberto entram depois do lançamento interno.
- Se o certificado tem valor formal (carga horária, validação externa) ou é só comprovante interno.
- A métrica de sucesso de cada público (conclusão, venda, menos chamados de assistência).
- Os perfis de acesso exatos e os nomes do domínio. Ainda não existe `GLOSSARY.md`.

## Brand Commitments

- Nome: Profills Brasil. A plataforma de cursos é uma superfície da mesma marca do site institucional.
- Tom pedido pelo dono para esta plataforma: amigável e alegre, sem perder a seriedade técnica da marca.
- Paleta escolhida pelo dono: a combinação nº 213, "Sol e céu", do *A Dictionary of Color Combinations*, vol. 1 (Sanzo Wada). As cores são Apricot Yellow, Pale King's Blue e Vinaceous Cinnamon, sobre base cinza escura. O protótipo da decisão está em https://claude.ai/artifact/JJqhNfeSVoUhUA3vMCU5xH.

## Evidence on Hand

Ainda não há cursos, alunos, depoimentos, números de conclusão nem certificados emitidos. Nenhuma tela, texto ou material de venda pode inventar esses dados; use exemplos marcados como exemplo.

## Product Principles

1. Um catálogo, acesso por perfil. Todo curso existe uma vez, e o que muda entre funcionário, cliente e público aberto é a liberação.
2. O conhecimento da fábrica é o produto. Conteúdo sobre máquina real tem precisão técnica de quem fabrica e dá suporte.
3. Feito para estudar de verdade. Sessões longas no computador pedem leitura confortável e progresso visível, antes de efeito.
4. Ninguém deixa de enxergar um texto ou um botão.
5. Aprender deve ser agradável. A plataforma acolhe quem está começando e motiva a terminar.

## Accessibility & Inclusion

- Contraste WCAG 2.1 AA como requisito do dono: texto a 4,5:1 (critério 1.4.3) e botão, barra de progresso e indicador de estado a 3:1 contra o que está atrás (critério 1.4.11).
- Vermelho só para erro e alerta, nunca para destaque, novidade ou progresso.
