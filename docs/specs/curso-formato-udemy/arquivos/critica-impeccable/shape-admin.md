# Shape: o admin enxerga progresso (P2 da crítica)

Data: 2026-10-14. Base: `main` em `ae2e807`. Modo Operate. Origem: P2 de `apps/web/.impeccable/critique/2026-10-15T00-18-47Z__src.md` e a seção "[P2] O admin não enxerga progresso, só liberação" de `avaliacao-a.md`.

## Resultado

- O dado já existe e a regra já existe. A posição, a aula assistida e o certificado de cada pessoa estão no banco, e `montarPainel` já calcula estado e progresso por curso e por trilha para o aluno. O admin não vê nada disso porque nenhuma consulta do admin lê essas tabelas.
- A proposta acrescenta um resumo por pessoa na busca (1 statement a mais, com os 20 userIds de uma vez, todo por índice existente) e o acompanhamento de cada liberação na tela de acesso (3 statements a mais em paralelo, os mesmos do painel do aluno). Nenhum índice novo e nenhuma migração.
- Recomendo a variante B nas duas telas: selo de situação na busca e lista de acompanhamento no lugar da tabela de liberações. Ela tem uma marcação só para desktop e 390 px.
- A liberação de várias pessoas de uma vez vira issue à parte (rascunho no fim).
- Sobram 3 perguntas para o dono, numeradas no fim: a variante, o limiar de "Parado" e o que a primeira tela do admin lista.

Desenhos: `docs/specs/curso-formato-udemy/arquivos/critica-impeccable/shape-admin/index.html` (as duas variantes lado a lado e as quatro telas de 390 px, com dados de exemplo). Captura de conferência a 1600 px: `docs/specs/curso-formato-udemy/arquivos/critica-impeccable/shape-admin/captura-1600.png`.

## 1. Mapa do que existe

### Onde mora cada fato

| Fato | Tabela | Chave e índices | Arquivo |
|---|---|---|---|
| Liberação | `liberacao` (trilha ou curso, origem, liberada e revogada) | `liberacao_ativa_por_pessoa (user_id) where revogada_em is null`, `liberacao_do_aluno (user_id, id)`, as duas únicas parciais por alvo, `liberacao_por_trilha` | `packages/db/src/schema/acesso.ts` |
| Aula assistida (90% do vídeo) | `aula_assistida` | PK `(user_id, aula_id)`, `aula_assistida_por_dia (user_id, dia)`; `dia` é a data de São Paulo, coluna gerada | `packages/db/src/schema/estudo.ts` |
| Posição na aula | `posicao_aula` (`posicao_seg`, `trechos_vistos`, `atualizada_em`) | PK `(user_id, aula_id)` | `estudo.ts` |
| Conclusão | `certificado` | `certificado_um_por_curso (user_id, curso_id)` | `estudo.ts` |
| Ordem da trilha | `trilha_curso` | PK `curso_id`, `trilha_curso_posicao_unica (trilha_id, posicao)` | `packages/db/src/schema/catalogo.ts` |
| Módulo e aula | `modulo`, `aula` | `modulo_numero_unico (curso_id, numero)`, `aula_posicao_unica (modulo_id, posicao)` | `catalogo.ts` |

As regras puras que já respondem "começou, parou onde, concluiu":

- `packages/api/src/dominio/curso.ts`: `progresso` (aulas assistidas sobre aulas, com floor), `estadoDoCurso` (seis estados do glossário; certificado vence tudo) e `estadosDaTrilha` (a regra sequencial, com o curso liberado direto destravado).
- `packages/api/src/dominio/historico.ts`: `historicoDe` (assistidas, posições acima de 0 s, certificados) e `atividadeDe` (o último momento por aula, assistida ou posição).
- `packages/api/src/dominio/painel.ts`: `montarPainel` monta `TrilhaVM` (cursos concluídos, aulas da trilha, curso da vez, situação `em_curso`, `aguardando_producao`, `concluida`) e `CursoVM` (progresso, módulo atual).
- `packages/api/src/consultas/meus-cursos.ts`: `linhasDoPainel` lê tudo isso em 5 statements paralelos; os statements 2, 3 e 4 (assistidas, posições, certificados) são só `where user_id = $1`.
- `packages/api/src/consultas/edicao-da-trilha.ts`: `comecaramSoPelaTrilha` já repete a regra "começou" em SQL, e o teste de integração a confere contra `meusCursos.painel`. É o precedente do que esta proposta evita: aqui a regra não se repete, a montagem chama as mesmas funções puras.

### O que o admin lê hoje

- Busca: `admin.alunos.buscar` (`packages/api/src/routers/admin.ts`) só chama `ctx.pessoas.buscar(termo)`. `pessoasDoClerk` (`packages/api/src/externos/pessoas.ts`) devolve até 20 `Pessoa` (`nome`, `email`, `foto`, `userId`) e o total; termo vazio ordena por `-last_active_at` do Clerk, que mede uso do login, não estudo. Nenhum banco. A linha (`apps/web/src/components/admin/lista-de-pessoas.tsx`) mostra foto, nome, e-mail e a seta.
- Acesso: `admin.alunos.acesso` chama `ctx.pessoas.porId` e `linhasDoAcesso` (`packages/api/src/consultas/liberacao.ts`) em paralelo. `linhasDoAcesso` faz 3 statements: todas as liberações da pessoa com o título do alvo, o catálogo de cursos e o de trilhas. `montarAcesso` (`packages/api/src/dominio/liberacao.ts`) deriva `acao`, `liberado`, `pelaTrilha` e `trocadosNaTrilha`. A tabela (`apps/web/src/components/admin/acesso-do-aluno.tsx`, `Liberacoes`) tem Acesso, Origem, Liberada em e a ação, com `min-w-[640px]`; em 390 px ela rola e esconde Revogar (`a-17`).
- Nenhuma consulta do admin toca `aula_assistida`, `posicao_aula` ou `certificado`.

### Quanto custa

Medido no Supabase local (`127.0.0.1:54322`, transação só de leitura; 17 liberações, 153 aulas assistidas, 132 aulas, 4 pessoas). O número de lá não mede o cloud: no cloud o custo é a ida e volta ao pooler de `sa-east-1`, e statements paralelos pagam uma ida e volta.

- Painel do aluno hoje (`linhasDoPainel`, `user_seedA`, 5 liberações): 5 statements, 4,7 ms, 29 KB de JSON (medido, com 3 aquecimentos antes).
- Acesso hoje (`linhasDoAcesso`): 3 statements, 1,6 ms (medido).
- Resumo da busca proposto (seção 3, 5 userIds): 1 statement, 0,5 ms de execução e 1,3 ms de planejamento na segunda rodada (medido com `explain analyze`). Com `enable_seqscan = off`, cada subconsulta usa índice existente: `liberacao_ativa_por_pessoa` e `liberacao_do_aluno` (index only), `aula_assistida_por_dia` de trás para frente com limit 1 (index only, um registro), `posicao_aula_pkey` (as posições da pessoa, uma por aula tocada) e `certificado_um_por_curso` (index only).
- Acesso proposto: o statement de liberações passa a trazer o conteúdo do alvo (o `COM_CONTEUDO` do painel, módulos e aulas), e entram os statements 2, 3 e 4 do painel. São 6 statements em paralelo no lugar de 3; pelo painel, a ordem de grandeza é a de 5 ms locais e 30 KB entre banco e servidor (inferido do painel medido). O cliente não recebe o catálogo: `montarAcesso` entrega só o acompanhamento já derivado, perto de 200 bytes por liberação (estimado).

## 2. Brief

### Quem chega e para quê

O admin da Profills, no computador, abre a área para duas coisas: liberar acesso e saber quem está estudando. O PRODUCT.md diz que "o admin acompanha o progresso de quem recebeu a liberação numa área de admin separada", e hoje nenhuma tela do admin responde "a pessoa começou? parou onde? terminou?". No lançamento o público é o funcionário da Profills; não existe prazo nem curso obrigatório, então o acompanhamento informa, não cobra.

### O que precisa dar certo

1. Na busca, sem abrir ninguém, o admin vê quem tem liberação, quem nunca abriu uma aula, quem parou e quem terminou.
2. Na tela de acesso, cada liberação diz o progresso (aulas sobre aulas), onde a pessoa está (módulo e aula) e quando estudou pela última vez. Na trilha, o admin vê o curso da vez e o estado de cada curso em ordem.
3. A coluna Origem sai. "Troca" aparece como texto ao lado do tipo, só quando a liberação veio de troca.
4. Em 390 px nada rola na horizontal e Revogar fica visível em toda linha.

### Direção escolhida

Dentro do mundo do DESIGN.md, sem peça visual nova: os selos de estado já existentes (Céu cheio para concluído, Sol a 14% para o que anda, Canela cheio para "Falta a prova", `popover` para quem não começou, contorno para o que está parado ou fora do ar), a barra de progresso de 4 px do cartão Continuar, cartões de 20 px e a seção do admin (`Secao`). A tese é trocar número solto por uma frase de estado: o admin lê "Parou no módulo 2, aula 1, há 23 dias" e não precisa montar a frase na cabeça.

### Escopo

- Entra: o resumo por pessoa na busca, o acompanhamento por liberação na tela de acesso, o layout de 390 px dessas duas peças.
- Não entra: liberação em lote (issue à parte), um painel geral de progresso de todos os alunos (depende da pergunta 3), relatório exportável, progresso por aula, quiz e prova (a prova ainda não existe; o estado `prova` é "viu todas as aulas e não tem certificado").
- Não muda: as seções "Liberar trilha" e "Liberar curso", a confirmação na linha, a ordem das liberações (`ordemNaTela`), o foco depois de liberar e revogar, a regra de foco (o foco é o hover; nenhum anel).

### Estados

Por liberação, derivados no servidor de `estadoDoCurso` e da última atividade do curso:

| Situação | De onde vem | Selo | Frase (exemplo) |
|---|---|---|---|
| Nunca abriu | `nao_iniciado` | `popover`, livro | "Nenhuma aula aberta · liberado há 12 dias" |
| Estudando | `em_andamento`, último estudo dentro do limiar | Sol a 14%, play | "Módulo 8, aula 4 · último estudo ontem" |
| Parado | `em_andamento`, último estudo além do limiar | contorno `texto-apagado`, pausa | "Parou no módulo 2, aula 1 · há 23 dias, em 21 set" |
| Falta a prova | `prova` | Canela cheio | "Viu as 2 aulas. Falta a prova · último estudo em 30 set" |
| Concluído | `concluido` | Céu cheio, check | "Concluído em 12 set" (data do certificado) |
| Em produção | `em_breve` | contorno Céu, relógio | "Em produção · a pessoa ainda não vê" |
| Abre depois de X | `bloqueado`, só dentro da trilha | contorno, cadeado | "Abre depois do curso 2" |
| Revogada | `revogadaEm` | sem selo, linha apagada | "Tinha visto 1 de 5 aulas quando o acesso saiu · revogada em 2 set" |

A trilha usa a `situacao` de `TrilhaVM`: `em_curso` mostra o selo do curso da vez, `aguardando_producao` mostra "Aguardando produção" (contorno Céu), `concluida` mostra "Concluída" (Céu cheio). A barra da trilha é a soma das aulas dos cursos que não estão em produção, como no painel do aluno.

Por pessoa, na busca, com esta precedência:

1. Sem liberação: nenhuma liberação ativa. A frase diz "1 liberação revogada em 2 set" quando houve, ou "Nunca recebeu liberação".
2. Concluiu tudo: todo curso que ela alcança e que abre tem certificado.
3. Nunca abriu: tem liberação ativa e nenhum estudo registrado.
4. Estudando ou Parado: pelo último estudo contra o limiar.

"Último estudo" é o maior entre o dia da última aula assistida e o dia da última posição salva acima de 0 s, em São Paulo. Não uso o `last_active_at` do Clerk: ele marca login e uso do app, e quem só abriu a tela aparece como ativo sem ter estudado.

Faixas reais: a pessoa tem de 0 a perto de 10 liberações (6 é o máximo no banco local); a trilha tem de 1 a 3 cursos no seed; um curso tem de 2 a 90 aulas; a busca mostra no máximo 20 pessoas.

### Interação e layout

- Busca, variante B: foto, nome, e-mail e uma frase de 12 px com os números ("5 liberações · 2 de 5 cursos concluídos · último estudo ontem"); o selo da situação à direita, antes da seta. Em 390 px o selo desce para baixo da frase e a frase quebra linha.
- Acesso, variante B: a tabela vira uma lista. Cada item tem o título, o tipo e o selo numa linha; a frase de estado; a barra com "46 de 90 aulas"; e o rodapé "Liberada em 8 ago 2026" (ou "Trocado por pontos em 2 out 2026"). Revogar fica à direita do item; em 390 px desce para o pé dele. A trilha abre os cursos numa lista ordenada com o número (Céu cheio quando concluído, Sol no curso da vez), o estado e a fração. As revogadas ficam num `details` fechado no fim ("1 revogada").
- Variante A, para comparação: a busca ganha três colunas à direita (Liberações, Concluídos, Último estudo), que em 390 px viram uma linha de metadados; a tabela troca Origem por Progresso e Situação, e abaixo de 720 px de conteúdo cada linha vira um bloco. Na captura de conferência, a tabela de A estourou o cartão a 737 px de largura antes de eu apertar o padding: ela precisa de perto de 720 px de conteúdo, e numa tela de 1024 px com a sidebar aberta sobram perto de 680 px (inferido de 1024 − 248 da sidebar − 96 de padding).
- Hover e foco: a linha da busca mantém o hover de hoje (fundo `muted` a 40%, nome em `titulo`, seta em Céu); o `summary` das revogadas ganha fundo branco a 8% e texto `titulo`, como o módulo da coluna do player. Nada desenha anel.
- Números com `tabular-nums`. Nenhum vermelho: "Parado" é contorno neutro, porque não é erro.

### Restrições

- A barra de 4 px herda o problema do `trilho` (#4d5257 sobre #33383e mede 1,5:1, abaixo dos 3:1 do PRODUCT.md, apontado na avaliação A). O texto "46 de 90 aulas" carrega a informação; a correção do token é de outra issue e vale aqui também.
- "Nunca abriu" é a palavra do admin para o que o aluno lê como "Não iniciado", do mesmo jeito que o admin lê "Em produção" e o aluno "Em breve". Os termos novos ("Último estudo", "Parado", "Situação da pessoa") não estão no `GLOSSARY.md` e devem entrar pelo `/domain-modeling` no PR.
- Pessoa apagada do Clerk não aparece na busca (a lista vem do Clerk) e continua aparecendo na tela de acesso pelo `userId`, agora com o progresso.

## 3. Formato do dado novo

Os nomes seguem o glossário (Liberação, Progresso, Estado do curso, Curso da vez).

### Domínio: `packages/api/src/dominio/acompanhamento.ts` (novo, puro)

```ts
export const LIMIAR_PARADO = { dias: 14, unidade: "corridos" } as const; // pergunta 2

export type SituacaoNoCurso =
  | { tipo: "nunca_abriu" }
  | { tipo: "estudando"; onde: Onde; ultimoEstudo: DiaISO }
  | { tipo: "parado"; onde: Onde; ultimoEstudo: DiaISO; dias: number }
  | { tipo: "falta_prova"; ultimoEstudo: DiaISO }
  | { tipo: "concluido"; em: string }
  | { tipo: "bloqueado"; abreDepoisDe: string }
  | { tipo: "em_producao" };

export interface Onde { modulo: number; aula: number }

export interface CursoAcompanhado {
  titulo: string;
  progresso: Progresso; // dominio/curso.ts
  situacao: SituacaoNoCurso;
}

export type Acompanhamento =
  | { tipo: "curso"; curso: CursoAcompanhado }
  | {
      tipo: "trilha";
      cursos: readonly (CursoAcompanhado & { posicao: number })[];
      concluidos: number;
      aulas: Progresso;
      daVez: number | null; // posição do curso da vez
      situacao: TrilhaVM["situacao"];
    };

export function acompanhar(
  alvo: CursoCatalogo | TrilhaCatalogo,
  h: Historico,
  atividade: ReadonlyMap<AulaId, string>,
  liberadosDireto: ReadonlySet<CursoId>,
  hoje: DiaISO
): Acompanhamento;

export type SituacaoDaPessoa =
  | { tipo: "sem_liberacao"; ultimaRevogacao: string | null }
  | { tipo: "concluiu_tudo"; ultimoEstudo: DiaISO | null }
  | { tipo: "nunca_abriu"; desde: string }
  | { tipo: "estudando"; ultimoEstudo: DiaISO }
  | { tipo: "parado"; ultimoEstudo: DiaISO; dias: number };

export interface ResumoDaPessoa {
  ativas: number;
  alcanca: number;    // cursos que ela alcança e que abrem, mais os concluídos
  concluidos: number;
  situacao: SituacaoDaPessoa;
}

export function situacaoDaPessoa(linha: LinhaDoResumo, hoje: DiaISO): SituacaoDaPessoa;
```

`acompanhar` chama `estadoDoCurso` ou `estadosDaTrilha` e `progresso`; o que ele acrescenta é o último estudo do curso (o maior valor de `atividade` entre as aulas dele), o `Onde` (a próxima aula de `em_andamento`, localizada como em `retomada.ts`) e o limiar. A liberação revogada passa pela mesma função com o antecessor `livre`, e a tela mostra só a fração dela.

`LiberacaoNaTela` (em `dominio/liberacao.ts`) ganha `acompanhamento: Acompanhamento`; `origem` fica, porque a tela usa para escrever "por troca". `ResultadoDaBusca.pessoas` passa a `readonly (Pessoa & { resumo: ResumoDaPessoa })[]`.

### Consultas

- `packages/api/src/consultas/acompanhamento.ts` (novo): `resumoDasPessoas(db, userIds)`, um statement para até 20 userIds. É o SQL que rodei no banco local:

```sql
with p(user_id) as (select unnest($1::text[])),
alcance as (
  select l.user_id, l.curso_id from liberacao l
   where l.user_id in (select user_id from p) and l.revogada_em is null and l.curso_id is not null
  union
  select l.user_id, tc.curso_id from liberacao l join trilha_curso tc on tc.trilha_id = l.trilha_id
   where l.user_id in (select user_id from p) and l.revogada_em is null
),
contaveis as (
  select a.user_id, (ce.id is not null) as concluido
    from alcance a
    join curso c on c.id = a.curso_id
    left join certificado ce on ce.user_id = a.user_id and ce.curso_id = a.curso_id
   where ce.id is not null
      or (c.status = 'publicado' and exists (
            select 1 from modulo m join aula au on au.modulo_id = m.id where m.curso_id = c.id))
)
select p.user_id,
  (select count(*) from liberacao l where l.user_id = p.user_id and l.revogada_em is null)::int as ativas,
  (select min(l.liberada_em) from liberacao l where l.user_id = p.user_id and l.revogada_em is null) as ativa_desde,
  (select max(l.revogada_em) from liberacao l where l.user_id = p.user_id) as ultima_revogacao,
  (select count(*) from contaveis x where x.user_id = p.user_id)::int as alcanca,
  (select count(*) from contaveis x where x.user_id = p.user_id and x.concluido)::int as concluidos,
  greatest(
    (select max(a.dia) from aula_assistida a where a.user_id = p.user_id),
    (select max((pa.atualizada_em at time zone 'America/Sao_Paulo')::date) from posicao_aula pa
      where pa.user_id = p.user_id and pa.posicao_seg > 0)) as ultimo_estudo
from p;
```

  A regra "abre" (publicado com aula, ou concluído) é a de `estadoDoCurso`; ela aparece de novo em SQL, como em `comecaramSoPelaTrilha`, e pede o mesmo teste de integração que confere o número contra `meusCursos.painel`.

- `packages/api/src/consultas/meus-cursos.ts`: os statements 2, 3 e 4 viram `linhasDoHistorico(db, userId)`, que o painel e o acesso chamam.
- `packages/api/src/consultas/liberacao.ts`: `linhasDoAcesso` troca o primeiro statement pelo de `linhasDoPainel` sem o filtro de ativa (todas as liberações, com `revogadaEm` e o `COM_CONTEUDO` do alvo) e chama `linhasDoHistorico` no mesmo `Promise.all`. O statement de cursos e o de trilhas ficam como estão.

### Procedures

- `admin.alunos.buscar`: chama o Clerk, depois `resumoDasPessoas` com os userIds da página, e devolve `montarBusca(resultado, linhas, hoje)`. São duas idas em série (o Clerk entrega os ids). Sem mudança de entrada.
- `admin.alunos.acesso`: mesma entrada; `montarAcesso` recebe o histórico e `hoje` e põe o `acompanhamento` em cada liberação.
- Nenhum procedure novo. `routers/admin.test.ts` continua cobrindo os dois.

### Testes que o PR precisa

- `dominio/acompanhamento.test.ts`: cada linha da tabela de estados, o limiar nos dois lados, a revogada, a trilha com curso liberado direto.
- Integração: `resumoDasPessoas` contra `meusCursos.painel` para `alcanca` e `concluidos` (o mesmo padrão de `edicao-da-trilha.integration.test.ts`), e o estado de cada curso do acesso igual ao do painel para liberações ativas.

## 4. Liberação de várias pessoas: issue à parte

Decisão: não entra neste trabalho. Motivos:

1. É outro problema da crítica. P2 é visibilidade (heurística 6, memória de trabalho); o lote é eficiência (heurística 7, persona Alex).
2. A entrada muda de direção. Hoje o admin parte da pessoa para o alvo; o lote parte do alvo para várias pessoas, e a busca do Clerk devolve 20 por vez, então escolher 30 pessoas pede seleção que sobrevive a várias buscas.
3. O servidor decide por pessoa. `liberar` trava cada aluno, e liberar trilha recusa quando os cursos trocados mudaram (`trocadosVistos`). Em lote, uma parte pode precisar do aviso de troca e outra não, e a tela precisa de um relatório por pessoa (liberada, já tinha, precisa confirmar).
4. Não há número de turma. Nenhum dado do produto diz quantas pessoas o admin libera de uma vez no lançamento interno.
5. Depende pouco desta proposta. O resumo da busca (liberações e situação por pessoa) é o que a tela do lote vai mostrar, então ela fica mais barata depois deste PR.

Rascunho da issue (só sai com pedido do dono):

> Título: Liberar uma trilha ou um curso para várias pessoas de uma vez
>
> Hoje, liberar a trilha Formação comercial para 5 funcionários novos pede 5 buscas, 5 páginas e 5 cliques em Liberar. A liberação é por pessoa (`admin.alunos.liberar`), com a trava do aluno e o aviso de cursos trocados por pontos.
>
> Pedido: a partir do editor da trilha ou do curso, escolher várias pessoas e liberar numa ação. O resultado mostra, por pessoa, se a liberação é nova, se ela já tinha, ou se precisa do aviso de troca antes.
>
> Fora: importar lista por arquivo; liberação por empresa cliente (depende do perfil por empresa, decisão aberta no PRODUCT.md).

## 5. Suposições declaradas

- O público do lançamento tem dezenas de pessoas, não milhares. Com isso, ler o Clerk primeiro e o banco depois cabe; com milhares, a primeira tela pediria a lista vinda do banco (pergunta 3).
- A liberação revogada mostra o progresso congelado. O dado continua no banco e volta a valer se o admin liberar de novo.
- A ordem das liberações não muda. Ordenar por "precisa de atenção" mexeria no lugar do foco depois de revogar.
- Para medir, criei e apaguei `packages/api/.medir-tmp.ts` no repo; `git status` ficou só com os dois diretórios `.impeccable/` que já estavam lá.

## Perguntas ao dono

1. Qual variante entra? Veja as duas em `docs/specs/curso-formato-udemy/arquivos/critica-impeccable/shape-admin/index.html`.
   - B, situação e lista de acompanhamento (recomendada). Pró: o admin acha "Nunca abriu" e "Parado" sem ler número, a trilha mostra cada curso em ordem, e a mesma marcação serve a 390 px. Contra: cada liberação ocupa mais altura (perto de 130 px contra 90 px da tabela), e comparar a mesma coluna entre linhas fica mais difícil.
   - A, colunas e tabela com progresso. Pró: mais densa e parecida com a tela de hoje; boa para comparar números de cima a baixo. Contra: não diz em palavras quem precisa de atenção, esconde os cursos dentro da trilha e precisa de um segundo layout abaixo de 720 px de conteúdo, o que já pega uma tela de 1024 px com a sidebar aberta.

2. Depois de quanto tempo sem estudar a pessoa aparece como "Parado"?
   - 10 dias úteis (recomendado). Pró: é a mesma régua da sequência de dias, que já ignora sábado e domingo, e um feriado prolongado não marca ninguém. Contra: o admin precisa lembrar que o número não é de dias corridos.
   - 14 dias corridos. Pró: simples de explicar ("duas semanas"). Contra: duas semanas com feriado ou férias marcam como parado quem não teria aula para ver.
   - Sem rótulo "Parado", só a data do último estudo. Pró: não cria regra nova sem prazo de conclusão no produto. Contra: o admin volta a fazer a conta de cabeça, que é o problema da crítica.

3. O que a primeira tela de Alunos lista, antes de qualquer busca?
   - "Ativos recentemente" do Clerk, como hoje, com o resumo novo em cada linha (recomendada para este trabalho). Pró: não muda a entrada da tela e cabe neste PR. Contra: a ordem segue o login, não o estudo; quem nunca entrou no app não aparece.
   - "Quem estuda", lida do banco: pessoas com liberação ativa, ordenadas pelo último estudo, com filtros Nunca abriu e Parado. Pró: responde a pergunta da crítica ("liberar ou saber quem estuda?") na primeira tela. Contra: é uma consulta nova sobre todas as pessoas com liberação, mais uma ida ao Clerk por página para nome e foto, e merece PR próprio.

## Respostas do dono (2026-10-14)

1. Variante B: selo de situação e frase na busca, lista de acompanhamento nas liberações, revogadas recolhidas no fim.
2. Sem rótulo "Parado". A situação de quem parou não ganha selo: a frase mostra só a data do último estudo ("último estudo em 21 set"). Os selos que ficam: Estudando, Nunca abriu, Falta a prova, Concluído (ou Concluiu tudo), Em produção, Sem liberação.
3. A primeira tela de Alunos continua com a lista do Clerk ("Ativos recentemente"), agora com o resumo de cada pessoa.
