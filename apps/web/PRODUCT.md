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

- Os alunos assistem a vídeo-aulas gravadas organizadas em módulos, leem material de apoio (apostilas, PDFs, texto na aula), respondem ao questionário de cada aula e recebem certificado.
- Um mesmo catálogo serve aos três públicos. Cada pessoa vê os cursos liberados para o perfil ou a empresa dela.
- O catálogo tem um tipo só de coisa: o curso, no formato da Udemy, com módulos como seções e aulas em sequência. Não existe ordem entre cursos: um curso liberado abre sem esperar outro (`docs/adr/0001-catalogo-so-de-cursos.md`).
- Um admin cria os cursos e os libera por pessoa (por exemplo, cursos X e Y para uma pessoa e só X para outra). Não existe curso obrigatório. O admin acompanha o progresso de quem recebeu a liberação numa área de admin separada.
- Clientes e público aberto recebem cursos liberados do mesmo jeito; a compra ou a assinatura só libera cursos.
- A liberação é permanente. Ela só some se o admin revogar.
- Não há prazo de conclusão em liberação nenhuma.
- O Profills School Comercial (módulos 0 a 15 do protótipo anterior) é um curso só, com 16 módulos.
- Existe gamificação individual: pontos, sequência de dias e medalhas. Não existe ranking nem comparação entre colegas.
- Pontos seguem a tabela do protótipo anterior como ponto de partida: 10 por aula assistida (90% do vídeo), 5 por acerto no questionário da aula na primeira tentativa, aprovada ou não, 100 por curso concluído e 30 por 7 dias de sequência. Rever aula não pontua de novo, e o questionário pontua só na primeira tentativa. A regra é só do questionário: a tentativa seguinte não mexe nos pontos da aula assistida, que entram quando o vídeo chega a 90%, e o resultado diz "O questionário pontua só na primeira tentativa", nunca que nada mais pontua. Os valores ficam fixos em `packages/api/src/dominio/regras.ts` até existir a tela em que o admin os ajusta.
- A sequência conta dias úteis: um dia vale com uma aula concluída, e sábado e domingo nunca quebram a sequência.
- Pontos são trocados por cursos. O admin marca quais cursos aceitam troca e o preço em pontos. Os três públicos podem trocar, e o curso trocado fica liberado para sempre. A troca tem uma tela própria, separada de "Meus cursos".
- Cada aula pode ter um questionário, com pontos só na primeira tentativa.
- O admin publica comunicados (por exemplo, "Módulo 13 atualizado").
- O protótipo anterior da plataforma é o artifact "Profills School Academia" (https://claude.ai/artifact/U7ySDnhvgN72ky4MgTgbu2). Ele serve de referência de funções, não de regra: o obrigatório, o prazo, o ranking e a paleta dele foram descartados.
- O acesso é misto: curso pago avulso, assinatura, curso gratuito para certos usuários e acesso 100% gratuito para outros.
- A empresa é a Profills Brasil, fabricante de máquinas para produtos líquidos, pastosos e sólidos. O site institucional fica em outro repositório (`site-profills-brasil`).

## Capabilities and Constraints

Confirmado:

- Formatos de aula: vídeo gravado, material para ler, questionário e certificado. Hoje a aula tem vídeo, descrição e questionário; o material para ler ainda não existe.
- O certificado de um curso sai quando a pessoa assiste a todas as aulas e é aprovada em todos os questionários.
- Temas: máquinas da Profills, processo de envase e embalagem, vendas e atendimento, rotinas internas.
- Uma plataforma com controle de acesso por perfil e por empresa cliente. A autenticação é do Clerk e a autorização mora nos procedures do tRPC (ver `CLAUDE.md` da raiz). Hoje a liberação é por pessoa; perfil e empresa ainda não existem no código.
- Cobrança em dois modelos: compra avulsa e assinatura, além de liberação gratuita por usuário.

Fora do escopo confirmado:

- Aula ao vivo não entra agora.

Decisões abertas:

- Preços, planos de assinatura e o meio de pagamento.
- Como compra e assinatura viram liberação de curso (quais cursos cada plano libera).
- Quando os clientes e o público aberto entram depois do lançamento interno.
- Se o certificado tem validação externa (órgão, entidade de classe) além da conferência pelo código.
- A métrica de sucesso de cada público (conclusão, venda, menos chamados de assistência).
- Os perfis de acesso exatos além de aluno e admin. Curso, liberação, admin e o resto do vocabulário estão no `GLOSSARY.md` da raiz.

Decididas pelo dono em 2026-10-16:

- O questionário de cada aula aprova com 70%, igual em todo curso, e a pessoa tenta de novo quantas vezes quiser. A regra completa está no `GLOSSARY.md` (Questionário, Nota mínima e Tentativa).
- O certificado é uma página do app e um PDF para baixar, com nome, curso, data, carga horária e código. A carga horária é a soma da duração dos vídeos, arredondada para cima em horas. Uma página pública confere o certificado pelo código.
- Conquistas são medalhas por marco que o app já registra: primeira aula, 10, 50 e 100 aulas assistidas, sequência de 7 dias, primeira troca, primeiro curso concluído e um certificado por curso. Não há níveis de aluno.
- Ponto não vence, e não há teto diário para os pontos de vídeo. O limite de taxa do player já barra abuso.
- O menu do aluno não tem Início: Meus cursos é a primeira tela. A tela Comunicados lista todos os comunicados do aluno, com o mais recente em destaque e a capa do curso cobrindo o lado direito do cartão.
- A sidebar recolhe sozinha na página da aula e volta como a pessoa a deixou quando ela sai. O app não tem migalha (breadcrumb).
- A aula sem pergunta não tem questionário a aprovar.
- O certificado é uma página do app (A), com a folha do PDF (A) e a conferência pública num recibo (D), das versões do protótipo.

## Brand Commitments

- Nome: Profills Brasil. A plataforma de cursos é uma superfície da mesma marca do site institucional.
- A plataforma se chama Profills Cursos, decisão do dono que substitui o "Profills School" do protótipo anterior. O nome mora em `apps/web/src/lib/marca.ts`, e o lockup e o ícone ficam em `apps/web/public/marca/`.
- Marca, escolhida pelo dono entre seis protótipos: o cubo em camadas com a seta, o símbolo da Profills School, recolorido nas três cores do app (Céu, Sol e Canela, uma por camada). Ao lado, "PROFILLS" claro e "CURSOS" no amarelo, na Orbitron. O favicon é o mesmo cubo. Origem, arquivos e a licença da fonte estão em `docs/marca/README.md`.
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
