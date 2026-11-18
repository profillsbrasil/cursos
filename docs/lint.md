# Lint e formato

O `bun run check` roda a Ultracite 8.3.0, que chama o oxfmt 0.79.0 (`oxfmt --check`) e o Oxlint 1.94.0 (`oxlint`) na raiz. O Oxlint roda com type-aware e com check de tipos (`options.typeAware` e `options.typeCheck` no `oxlint.config.ts`), e o backend é o tsrs 0.25.0-ts7.1.0-beta (`tsrs --lint headless`), sem o `oxlint-tsgolint` instalado. O `bun run check-types` (`tsc`) continua no CI ao lado, como árbitro, enquanto o tsrs for beta. O `bun run fix` roda `oxlint --fix` e `oxfmt --write`. Os configs são `oxlint.config.ts` e `oxfmt.config.ts`, na raiz. O Oxlint carrega dois plugins JS por `jsPlugins`: o `@interfere/landmines` 0.1.0 (`landmines-testing` e `landmines-structure`) e o anti-slop copiado em `tools/oxlint/anti-slop/`; decisões em "Plugins JS". O motivo de cada decisão mora neste arquivo, não em comentário no config.

## Custo do type-aware

Medido em 18 de novembro de 2026: `bun run check` por `systemd-run --user --same-dir --wait --pipe -p MemoryMax=4G -p MemorySwapMax=4G`, 5 rodadas de cada lado, alternadas, no mesmo código. O lado sem type-aware usa o `oxlint.config.ts` do commit `3c86299`. Parede é o "Service runtime", CPU é o "CPU time consumed" e memória é o "Memory peak" do cgroup, que soma bun, Ultracite, oxfmt, Oxlint e tsrs. O load average ficou entre 5 e 11 em 16 núcleos.

| Lado | Parede, mediana (faixa) | CPU, mediana | Pico de memória, mediana | Diagnósticos |
| --- | --- | --- | --- | --- |
| Sem type-aware | 1,38 s (1,16 a 1,61) | 7,55 s | 647 MB | 0 |
| Com type-aware | 2,10 s (1,97 a 2,97) | 12,74 s | 754 MB | 614 avisos, 0 erros |

As faixas não se cruzam. Os 5,2 s de CPU a mais vêm do tsrs, o único processo novo; não perfilei. O `oxlint --fix` que o hook do Claude Code roda no arquivo editado passou de 200 ms para 377 ms em `categorias.tsx`, mediana de 3 rodadas.

## Cercas de import

O `no-restricted-imports` do `oxlint.config.ts` cerca o banco em `apps/web`: só `src/services.ts` importa `@cursos/db`, e só `src/context.ts` e `src/server/api.ts` importam `@/services`. A mensagem do repo sai no campo `help` do diagnóstico.

## Fora do lint e do formato

- `docs/prototipos`, `.claude/settings.local.json` e `.impeccable/config.json` ficam fora dos dois, como no `biome.jsonc`.
- O Oxlint não linta `.claude/skills/*/templates/**`, motivo em "Check de tipos". O oxfmt formata esses arquivos.
- O Oxlint não linta o código do `shadcn add` (`packages/ui/src/components`, `packages/ui/src/hooks`, `packages/ui/src/lib/utils.ts`) nem `apps/web/public`. O oxfmt formata esses arquivos. O `--type-check` ainda devolve erro de tipo deles, porque o tsrs checa o programa inteiro do tsconfig (detalhe em "Escopo").
- O oxfmt não formata Markdown (`**/*.md`). O preset Biome da Ultracite já deixava o Markdown de fora; 76 dos 91 arquivos `.md` que o oxfmt mudaria são skills de terceiros travadas por hash no `skills-lock.json`, e o turbo e o `next dev` reescrevem blocos do `AGENTS.md`.
- `tools/oxlint/anti-slop/**` fica fora do Oxlint, do oxfmt e do programa do tsconfig da raiz ("Plugins JS").
- O oxfmt não formata SVG. O `docs/marca/cubo.ts` gravava os SVG da marca e chamava o Biome para formatá-los; agora só grava.

## O que saiu sem substituto

O Oxlint não linta CSS. O preset Biome da Ultracite ligava 26 regras de CSS, 22 delas vindas do Stylelint pela tabela de fontes do Biome, e o `useBaseline`, que o `biome.jsonc` desligava. Elas saíram sem substituto, então `apps/web/src/index.css` e `packages/ui/src/styles/globals.css` só passam pelo formato do oxfmt e pelos testes de CSS do repo (`foco.test.ts`, `movimento.test.ts` e afins). As regras eram: `useGenericFontNames`, `noInvalidDirectionInLinearGradient`, `noInvalidGridAreas`, `noInvalidPositionAtImportRule`, `noMissingVarFunction`, `noUnknownFunction`, `noUnknownMediaFeatureName`, `noUnknownProperty`, `noUnknownPseudoClass`, `noUnknownPseudoElement`, `noUnknownTypeSelector`, `noUnknownUnit`, `noUnmatchableAnbSelector`, `level`, `noDescendingSpecificity`, `noValueAtRule`, `noDuplicateAtImportRules`, `noDuplicateCustomProperties`, `noDuplicateFontNames`, `noDuplicateProperties`, `noDuplicateSelectors`, `noDuplicateSelectorsKeyframeBlock`, `noEmptyBlock`, `noImportantInKeyframe`, `noShorthandPropertyOverrides`, `noUnknownAtRules`.

## Supressões

A supressão é `// oxlint-disable-next-line <regra> -- <motivo>`, ou `{/* ... */}` em JSX. O `no-await-in-loop` acusa cada `await` do laço, e o `biome-ignore` cobria o laço inteiro; onde o laço tem mais de um `await`, o par `// oxlint-disable no-await-in-loop -- <motivo>` e `// oxlint-enable no-await-in-loop` cobre o mesmo trecho. Na troca do Biome, cada `biome-ignore` virou a supressão da regra do Oxlint que acusa ali; os 4 onde a regra do Oxlint não acusa saíram (`edicao-do-curso.ts`, `questionario-da-aula.tsx`, `topicos-do-curso.tsx` e `material-de-apoio.tsx`).

## Decisões herdadas do `biome.jsonc`

| Regra do Biome | Equivalente no Oxlint | Decisão |
| --- | --- | --- |
| `useMathMinMax` | `unicorn/prefer-math-min-max` | desligada: os casos comparam Date ou string, onde `Math.min` e `Math.max` devolvem número ou NaN |
| `useDomQuerySelector` | `unicorn/prefer-query-selector` | desligada |
| `useNamedCaptureGroup` | `prefer-named-capture-group` | desligada |
| `useUnicodeRegex` | `require-unicode-regexp` | desligada |
| `noImportCycles` | `import/no-cycle` | desligada |
| `noLoopFunc` nos testes | `no-loop-func` nos testes | desligada nos testes |
| `useBaseline` | nenhum: lintava CSS | saiu com o lint de CSS |

## Regras que acusaram na troca

Contagem do `oxlint -f json .` com os presets `core`, `react` e `next`, depois da formatação e das supressões: 3.380 diagnósticos em 67 regras. Decisões: 4 com autofix seguro (a), 59 desligadas no config (b), 3 corrigidas à mão (c) e 1 coberta por supressão.

| Regra | Ocorrências | Decisão | Motivo |
| --- | --- | --- | --- |
| `eslint(func-style)` | 1.065 | (b) desligada | O preset pede expressão (`const f = () =>`), e o repo declara com `function`. |
| `import(consistent-type-specifier-style)` | 476 | (b) desligada | Estilo: nenhum import do repo tem só especificadores `type` na forma inline, então o fix não muda que módulo carrega; a regra só pede `import type` separado onde o repo mistura valor e tipo no mesmo import. |
| `eslint(require-unicode-regexp)` | 411 | (b) desligada | O biome.jsonc já desligava (`useUnicodeRegex`): a flag `u` muda o que `.`, `\w` com `i` e as classes negadas casam, e recusa escapes que hoje valem. |
| `unicorn(switch-case-braces)` | 228 | (b) desligada | Estilo: o repo escreve `case` sem chave em 236 lugares e com chave em 21. |
| `eslint(prefer-named-capture-group)` | 178 | (b) desligada | O biome.jsonc já desligava (`useNamedCaptureGroup`): nomear os grupos não muda o que as regex fazem. |
| `unicorn(no-await-expression-member)` | 164 | (b) desligada | Estilo: `(await x).y` é a forma do repo, e a regra não tem autofix. |
| `unicorn(consistent-function-scoping)` | 115 | (b) desligada | Estilo: o repo mantém o ajudante perto de quem o usa; mover de escopo é refatoração sem defeito apontado. |
| `unicorn(no-useless-undefined)` | 97 | (b) desligada | Estilo: todas as ocorrências são `() => undefined`, em dublês de teste e callbacks vazios; nenhuma passa `undefined` como argumento. |
| `unicorn(prefer-string-replace-all)` | 85 | (b) desligada | Estilo: o repo usa `.replace(/.../g)` em 48 lugares e `.replaceAll` em 17. |
| `unicorn(catch-error-name)` | 67 | (b) desligada | Estilo: a regra pede `error`, e o repo nomeia em português (`erro`). |
| `unicorn(import-style)` | 58 | (b) desligada | Estilo: a regra pede import default de `node:path` e afins, e o repo importa por nome. |
| `unicorn(text-encoding-identifier-case)` | 56 | (b) desligada | Estilo: a regra pede `"utf-8"`, e o repo escreve `"utf8"` nos 49 lugares; o Node aceita os dois. |
| `eslint(no-use-before-define)` | 54 | (b) desligada | Estilo: o repo põe o componente exportado em cima e os ajudantes `function` embaixo; o uso antes da declaração de `let` e `const` o `tsc` já recusa. |
| `unicorn(no-array-sort)` | 51 | (b) desligada | Estilo: os casos ordenam um array novo (`.map(...).sort()`, `[...x].sort()`, literal), que ninguém mais lê; o único sobre array existente é `iguais.sort()` em `catalogo.integration.test.ts:166`, no último uso dele. |
| `promise(prefer-catch)` | 41 | (b) desligada | O fix muda semântica: em `.then(ok, falha)`, a `falha` não pega o erro lançado pelo `ok`, e o `.catch` pegaria. |
| `unicorn(no-array-reduce)` | 21 | (b) desligada | Estilo: os `reduce` encadeiam promessas em série nos testes de navegador. |
| `import(no-cycle)` | 20 | (b) desligada | O biome.jsonc já desligava (`noImportCycles`): o ciclo é `index.ts` -> `consultas/*` -> `index.ts` pelo `ErroParaAPessoa`. |
| `promise(avoid-new)` | 16 | (b) desligada | Estilo: os `new Promise` embrulham APIs de callback (WebSocket do Chromium, timers). |
| `react(hook-use-state)` | 14 | (b) desligada | Estilo: a regra pede `[x, setX]`, e o repo nomeia o setter com verbo em português (`[chave, pedir]`). |
| `jsx-a11y(prefer-tag-over-role)` | 13 | (b) desligada | Os 13 casos são `role="status"` de região viva; a tag `<output>` que a regra sugere tem semântica de formulário. |
| `eslint(no-inline-comments)` | 12 | (b) desligada | Estilo: os comentários no fim da linha explicam colunas do schema. |
| `promise(param-names)` | 10 | (b) desligada | Estilo: a regra pede `resolve` e `reject`, e o repo nomeia em português (`pronto`, `falhou`). |
| `eslint(no-loop-func)` | 9 | (b) desligada nos testes | Só nos testes, como o biome.jsonc já fazia (`noLoopFunc`): o `test()` criado no laço lê o `let` que o `beforeAll` preenche, e roda depois de propósito. |
| `unicorn(prefer-query-selector)` | 9 | (b) desligada | O biome.jsonc já desligava (`useDomQuerySelector`): `getElementById` lê o id exato; `querySelector` pediria `CSS.escape` nos ids do `useId`. |
| `eslint(no-promise-executor-return)` | 7 | (b) desligada | Estilo: `new Promise((r) => setTimeout(r, ms))` devolve o id do timer, que a Promise ignora. |
| `eslint(no-warning-comments)` | 7 | (b) desligada | Falso positivo: "Todo" nos 7 comentários é a palavra em português ("todo curso"), não marcador de pendência. |
| `promise(catch-or-return)` | 5 | (b) desligada | Os 5 casos tratam a falha no segundo argumento do `.then` ou chamam promessa que nunca rejeita (`encerrar()` faz `Promise.race` de um `allSettled` com um teto que só resolve). |
| `unicorn(no-array-for-each)` | 5 | (b) desligada | O fix muda semântica: os callbacks usam o índice, e `return` no callback não é `continue` no `for...of`. |
| `react(rule-suppression)` | 4 | (b) desligada | O React Compiler só reconhece supressão escrita como `eslint-disable` (`babel-plugin-react-compiler`), então o `oxlint-disable` não impede a compilação que a regra avisa. |
| `promise(always-return)` | 4 | (b) desligada | Estilo: os `.then` que acusam fazem efeito e não precisam devolver valor. |
| `unicorn(escape-case)` | 4 | (a) autofix | Autofix: o escape de U+00AD, de U+00A0 e o `\x7e` de `anexo.ts` passam a letras maiúsculas, o mesmo caractere. |
| `unicorn(custom-error-definition)` | 4 | (b) desligada | Estilo: a regra pede o sufixo `Error`, e `ErroParaAPessoa` é o nome do glossário. |
| `unicorn(no-unreadable-array-destructuring)` | 4 | (b) desligada | Estilo: `const [, , x]` aparece só em teste. |
| `react(memo-dependencies)` | 4 | (c) à mão | Os mesmos 4 `useCallback` do `react-hooks(exhaustive-deps)`; a correção de lá zera esta. |
| `react-hooks(exhaustive-deps)` | 4 | (c) à mão | Dependência faltando: o `useCallback` chama `edicao.executar` sem `edicao` nas deps. A correção desestrutura `executar`, como `categorias.tsx` já fazia com `limpar`; `executar` é arrow function e não usa `this`. |
| `eslint(complexity)` | 3 | (b) desligada | Estilo: os 3 casos são o redutor do editor e um teste de medida; partir as funções é refatoração sem defeito apontado. |
| `unicorn(no-array-reverse)` | 3 | (b) desligada | Estilo: os 3 casos invertem um array novo (`splice(0).reverse()` e `Object.entries(d).reverse()`), que ninguém mais lê. |
| `unicorn(no-new-array)` | 3 | (b) desligada | Estilo: os 3 casos são de teste e usam `new Array(n)` só pelo tamanho. |
| `react(preserve-manual-memoization)` | 3 | (b) desligada | Diagnóstico de otimização do React Compiler, não defeito: o build compila igual com e sem a regra. |
| `eslint(require-await)` | 3 | (b) desligada | Estilo: os 3 casos são dublês de teste que precisam devolver Promise. |
| `promise(no-return-wrap)` | 3 | (b) desligada | Estilo: os testes de `use-acao.test.ts` devolvem `Promise.reject` de propósito. |
| `unicorn(prefer-native-coercion-functions)` | 2 | (b) desligada | Sem autofix no Oxlint 1.94.0; aponta forma, não defeito. |
| `unicorn(prefer-spread)` | 2 | (b) desligada | Sem autofix seguro: `concat` achata argumento array e o spread não, e os 2 casos são de teste. |
| `unicorn(prefer-number-coercion)` | 2 | (b) desligada | O fix muda semântica: `Number("12px")` é `NaN`, e `Number.parseFloat("12px")` é 12 (`modulos-do-curso.tsx:490` lê o `top` do CSS). |
| `unicorn(no-hex-escape)` | 2 | (b) desligada | Sem autofix no Oxlint 1.94.0; aponta forma, não defeito. |
| `unicorn(prefer-code-point)` | 2 | (b) desligada | Sem autofix no Oxlint 1.94.0; os 2 casos leem um código UTF-16 só, onde as duas funções dão o mesmo. |
| `unicorn(consistent-existence-index-check)` | 2 | (a) autofix | Autofix: `< 0` vira `=== -1` e `>= 0` vira `!== -1` sobre `indexOf` e `findIndex`, que só devolvem -1 ou um índice. |
| `react(jsx-handler-names)` | 2 | (b) desligada | Estilo: a regra pede `handle*`, e o repo nomeia a ação (`acoes.trocar`). |
| `unicorn(prefer-array-find)` | 2 | (b) desligada | Sem autofix no Oxlint 1.94.0; aponta forma, não defeito. |
| `jsx-a11y(control-has-associated-label)` | 2 | (b) desligada | Falso positivo: o controle é o `render` do Base UI, e o rótulo vem dos filhos do componente que o envolve. |
| `react(no-unescaped-entities)` | 2 | (b) desligada | O `tsc` já recusa `>` e `}` soltos em texto JSX (TS1381, TS1382); o que sobra são aspas, que o React renderiza iguais. A regra não aceita opção para deixar só `>` e `}`. |
| `unicorn(no-object-as-default-parameter)` | 2 | (b) desligada | Estilo: os 2 casos são fábricas de teste. |
| `unicorn(numeric-separators-style)` | 2 | (a) autofix | Autofix: `0.039_28` vira `0.03928`, o mesmo número. |
| `next(no-html-link-for-pages)` | 2 | (b) desligada nos testes | Só nos testes: os 2 casos montam HTML estático para medir no Chromium, sem roteador. |
| `unicorn(relative-url-style)` | 2 | (a) autofix | Autofix: `new URL("./x", import.meta.url)` vira `new URL("x", import.meta.url)`, que resolve o mesmo arquivo. |
| `react(refs)` | 1 | (b) desligada | Falso positivo: `ref={p.refVideo}` passa o RefObject ao `ref`, sem ler `.current` no render. |
| `unicorn(prefer-add-event-listener)` | 1 | (b) desligada | Sem autofix no Oxlint 1.94.0; o `onerror` é de um `<script>` recém-criado, sem outro ouvinte. |
| `react(exhaustive-effect-dependencies)` | 1 | supressão | Dependência a mais de propósito em `coluna-do-curso.tsx`: o `biome-ignore` de `useExhaustiveDependencies` virou `oxlint-disable` desta regra no passo das supressões. |
| `unicorn(no-useless-collection-argument)` | 1 | (b) desligada | Sem autofix no Oxlint 1.94.0, e a sugestão sai quebrada (`o.assistidas) as AulaId[]`). |
| `node(callback-return)` | 1 | (b) desligada | Falso positivo: `await next()` é o middleware do tRPC, não callback de Node. |
| `eslint(logical-assignment-operators)` | 1 | (b) desligada | Sem autofix no Oxlint 1.94.0; aponta forma, não defeito. |
| `unicorn(no-array-fill-with-reference-type)` | 1 | (b) desligada | O caso é o valor esperado de um `toEqual` em teste, que compara por estrutura. |
| `react(no-clone-element)` | 1 | (b) desligada nos testes | Só nos testes: o caso é o dublê do `render` do Base UI. |
| `react(jsx-no-constructed-context-values)` | 1 | (b) desligada | O React Compiler, ligado no `next.config.ts`, memoiza o objeto do `value`. |
| `eslint(no-new-func)` | 1 | (b) desligada nos testes | Só nos testes: `service-worker.test.ts` executa a fonte do `public/sw.js`. |
| `promise(prefer-await-to-callbacks)` | 1 | (b) desligada | Estilo: o `.catch` do registro do service worker. |
| `jsdoc(check-tag-names)` | 1 | (c) à mão | O comentário de `foco.test.ts:120` começava a linha com `@supports`, que o JSDoc lê como tag. A linha põe `@supports` e `@media` em crase. |

## Type-aware

### Escopo

- `.claude/**`, `.railway/**` e `docs/marca/**` ficam fora dos 4 tsconfig (`apps/web`, `packages/api`, `packages/db` e `packages/ui`) e saem do type-aware: um override desliga nelas as 57 regras com tipos que os presets ligam (`REGRAS_COM_TIPOS` no `oxlint.config.ts`). Sem os tipos certos, essas regras acusavam 196 falsos positivos ali; no `.claude/hooks`, o tsconfig da raiz não traz os tipos do bun. O Oxlint 1.94.0 não liga o type-aware por arquivo. A lista é a interseção das regras com `type_aware: true` no `oxlint --rules -f json` e das que os presets ligam; uma regra type-aware nova num upgrade acusa nessas pastas e entra na lista.
- `oxlint.config.ts` e `oxfmt.config.ts` também ficam fora dos 4 tsconfig, mas o tsconfig da raiz os tipa, e eles passam sem diagnóstico.
- `partes.test.ts` e `partes.test.tsx` de `components/admin` viraram um `partes.test.tsx` só. Com dois arquivos do mesmo nome base, um `.ts` e um `.tsx`, na mesma pasta, o tsrs perde o `bun:test` do `.tsx` (TS2307) e cascateia 9 `no-unsafe-*`; renomear qualquer um dos dois zera o erro, e o `tsc` aceita os dois. Era o único par do repo (`git ls-files`).

### Decisões

Contagem do `oxlint -f json` com o type-aware ligado e o escopo acima, antes das correções: 1.857 diagnósticos em 33 regras type-aware. Saídas: (a) autofix seguro, (b) desligada ou com opção no config, (c) corrigida à mão.

| Regra | Ocorrências | Decisão | Motivo |
| --- | --- | --- | --- |
| `no-unsafe-type-assertion` | 621 | warn, fora do gate | É a regra que cobra os `as`. Os 7 `as` que o `no-unnecessary-type-assertion` tirou baixaram para 614, repartidos na tabela de baixo. |
| `promise-function-async` | 472 | (b) desligada | O fix põe `async` em 463 linhas de 135 arquivos e muda o canal de erro de quem lança antes de devolver a promessa. Com o `return-await` em `always`, ele leva o `return-await` de 72 para 551, quase tudo `async () => await f()`. Dos 472 corpos, só 3 lançam síncrono antes do `return` (`index.ts:54`, `index.ts:119` e `routers/admin.ts:390`), e os 3 são middleware ou resolver que o tRPC aguarda. |
| `strict-boolean-expressions` | 239 | (b) desligada | 158 são `string \| undefined` em condição, onde a regra pede tratar `""` à parte do `undefined`: mudar cada um é decidir de novo o que a string vazia quer dizer ali, sem defeito apontado. 51 são guardas de objeto que o tipo dá como sempre presente; 48 delas leem índice ou desestruturação de array (`const [saida] = pacote.outputs`), que sem o `noUncheckedIndexedAccess` não inclui `undefined`, e tirar a guarda muda o caso do array vazio. Nos 3 de número, o 0 vale ausente de propósito: bônus 0 não aparece em `status-do-player.tsx`, preço 0 é curso sem preço no seed e contagem 0 espera de novo no `troca.integration.test.ts`. |
| `no-confusing-void-expression` | 179 | (b) `ignoreArrowShorthand` e desligada nos testes | 174 são arrow curto que devolve `void` a quem ignora o retorno (handler e callback). Nos testes, os 5 `await expect(...).rejects` acusam porque o `bun-types` declara os matchers de `rejects` e `resolves` como `void`, e as 6 funções recursivas `Promise<void>` dos testes não satisfazem esta regra e o `return-await` ao mesmo tempo. |
| `return-await` | 72 | (a) autofix | Nenhum dos 72 está dentro de `try`: o `await` acrescenta a função ao stack trace e não muda o que o `catch` pega nem quando o `finally` roda. |
| `no-floating-promises` | 39 | (b) opção e (c) | O `allowForKnownSafeCalls` aceita o `mock.module` do `bun:test` (26), que devolve `void \| Promise<void>` e só é promessa com fábrica assíncrona. Os 13 restantes viraram `void` (o `receber` de `campo-de-capa.tsx`, porque o `conferir` devolve o erro em vez de lançar; o `encerrar()` do player, que não rejeita; os do `sessao.test.ts`, que avançam o relógio à mão) ou `await` (os `servidor.stop(true)` dos `afterAll`). |
| `prefer-regexp-exec` | 34 | (b) desligada | Sem autofix; `match` e `exec` dão o mesmo sem a flag `g`, e os 34 estão em teste. |
| `no-unnecessary-type-assertion` | 27 | (a) autofix | Tira `as` de tipo que o valor já tem; o `tsc` confere. |
| `no-base-to-string` | 25 | (b) opção e (c) | Os 18 `pacote.logs.join` são `BuildMessage` e `ResolveMessage` do `Bun.build`, que têm `toString` em runtime ("ResolveMessage: Could not resolve...") que o `bun-types` não declara; entram no `ignoredTypeNames`. Os 7 `String(dados.get(...))` de formulário viraram `campoDeTexto` (`lib/formulario.ts`): o mesmo texto para os campos de texto, e `""` no lugar de `"[object File]"` se um arquivo aparecesse ali. |
| `non-nullable-type-assertion-style` | 22 | (b) desligada | O fix escreve `x!`, que o `no-non-null-assertion` do mesmo preset recusa. |
| `strict-void-return` | 21 | (c) à mão | Arrow que devolve o resultado de `push`, `delete` ou `setTimeout` a quem espera `void` ganhou chaves; os handlers `async` do JSX (`sair`, `copiar`) viraram `() => { void f(); }`; o `.finally(() => db.$client.end())` do `codigo-gerado.integration.test.ts` virou `try`/`finally`. |
| `consistent-return` | 10 | (b) desligada | 7 são efeito ou callback de ref que devolve a limpeza só quando assinou algo, o que o React aceita (5 `useEffect`, 1 `useLayoutEffect` e o `reservarOTopo` de `modulos-do-curso.tsx`); 3 são os ramos de `camposDaVisao` em `visao.ts`, que devolve `undefined` para "todos". |
| `no-unsafe-assignment` | 10 | (b) nos testes e em `clerk.ts`, (c) no resto | Nos testes (7), o `bun-types` declara `AsymmetricMatcher` como `any` (`expect.any`, `stringMatching`), e `mock.calls`, `Reflect.get` e `rows` sem tipo devolvem `any`. Em `entrada/clerk.ts`, o `JSON.parse` que troca o nome do produto no `ptBR` é um cast de JSON e entra na frente dos casts. `controles-do-player.tsx` lê o volume por `typeof`, e `utils/clerk-auth.ts` lê `globalThis.Clerk` declarado com o `ClerkNoNavegador`. |
| `require-array-sort-compare` | 10 | (b) desligada nos testes | Os 10 ordenam para comparar como conjunto: 6 arrays de tupla ou string, 2 de booleano e 2 de número, `[-100, 500]` e `[100, 150]`, em que a ordem de texto e a numérica coincidem. |
| `no-deprecated` | 9 | (c) à mão | `FormEvent` virou `SubmitEvent`, o tipo que o `onSubmit` do `@types/react` 19.3 pede. |
| `prefer-nullish-coalescing` | 8 | (b) desligada | O fix troca `\|\|` por `??`, e nos 8 o `\|\|` cobre a string vazia de propósito (`navegador.platform \|\| ""`, `process.env.DATABASE_URL \|\| ""`, o nome do nível em branco). |
| `no-unsafe-argument` | 7 | (b) nos testes, (c) em `erros.ts` | Nos testes, 5 são o `expect.arrayContaining` (`AsymmetricMatcher`) e 1 é o `new Array(3).fill(...)`, que sai `any[]`. Em `minha-conta/erros.ts`, o `ClerkAPIError` do Clerk tem `Meta = any`; o `campoDoErro` lê o `paramName` como `unknown`. |
| `no-unnecessary-type-arguments` | 7 | (b) desligada | O fix tira `expect<unknown>`, e o `tsc` acusa TS2769 nos 7: o default do parâmetro é `unknown`, mas sem o argumento o tipo vem do valor. |
| `no-misused-spread` | 5 | (b) desligada | Os 5 espalham string para contar code points de propósito (`medidas-da-folha.ts`, `minha-conta/nome.ts`); o `Intl.Segmenter` que a regra sugere mudaria a contagem. |
| `prefer-string-starts-ends-with` | 5 | (a) autofix | Regex com âncora `^` e texto fixo virou `startsWith`; as duas constantes de regex que sobraram saíram. |
| `await-thenable` | 5 | (b) desligada nos testes | Os 5 são `await expect(...).rejects` e `.resolves`, que devolvem promessa em runtime e `void` no `bun-types` 1.4.4. Tirar o `await` faria o teste não esperar a asserção. |
| `switch-exhaustiveness-check` | 4 | (b) `considerDefaultExhaustiveForUnions` | Os 4 `switch` têm `default` que cobre o resto de propósito. |
| `no-misused-promises` | 4 | (c) à mão | Os mesmos handlers `async` do JSX e o `.finally` do `strict-void-return`. |
| `use-unknown-in-catch-callback-variable` | 4 | (a) e (c) | O autofix pôs `unknown`; nos 3 testes que leem `e.code`, a leitura passou a `e instanceof TRPCError ? e.code : undefined`, como o `liberacao.integration.test.ts` já fazia. |
| `unbound-method` | 3 | (c) à mão | `assinar` de `lib/player/sinal.ts` e `agendar` do relógio do `sessao.test.ts` viraram propriedade arrow; nenhum lia `this`. |
| `no-unsafe-member-access` | 3 | (c) à mão | `isTRPCClientError<AppRouter>` tipa o `data` do erro em `use-player-da-aula.ts`; `campoDoErro` em `erros.ts`; `c.query<{ id: string }>` no `restricoes.integration.test.ts`. |
| `no-generated-empty-object-type` | 3 | (c) à mão | `Record<never, never>` virou `unknown` em `dominio/conquistas.ts`: a `Medalha` só usa o tipo em interseção, e `T & unknown` é `T`. |
| `restrict-template-expressions` | 2 | (c) à mão | `coluna-do-curso.tsx` interpola a fonte de duas funções no script inline; agora com `.toString()` explícito, o mesmo texto. |
| `no-unnecessary-type-conversion` | 2 | (a) autofix | `Number` sobre número e `String` sobre string. |
| `prefer-includes` | 2 | (a) autofix | Regex sem metacaractere virou `includes`; as constantes que sobraram saíram. |
| `no-unsafe-call` | 1 | (b) desligada em `service-worker.test.ts` | O teste executa a fonte do `public/sw.js` por `new Function`, como o `no-new-func` dos testes. |
| `no-implied-eval` | 1 | (b) desligada em `service-worker.test.ts` | O mesmo `new Function`. |
| `no-unnecessary-type-parameters` | 1 | (b) desligada | `novoId<T>()` de `lib/editor.ts` usa o genérico só no retorno para o editor fabricar ids com marca; trocar pede um construtor por marca. |

### Os casts que ficam em warn

Os 614 `no-unsafe-type-assertion` por padrão do tipo de destino, contados pelo texto de cada asserção:

| Padrão | Teste | Produção | Total |
| --- | --- | --- | --- |
| Marca (`*Id`, `Email`, `Versao`, `DiaISO`, `Route`) | 350 | 143 | 493 |
| Outro tipo do domínio | 45 | 22 | 67 |
| `never` ou `as unknown as` | 22 | 1 | 23 |
| Genérico ou indexado | 12 | 6 | 18 |
| DOM | 2 | 5 | 7 |
| JSON | 6 | 0 | 6 |
| Total | 437 | 177 | 614 |

`packages/api/src` tem 404 deles e `apps/web/src/components`, 192. Desde o `comoTrechos` de `dominio/trechos.ts` ("Plugins JS"), o total é 611. O `JSON.parse` de `entrada/clerk.ts` é o sétimo cast de JSON, contado no `no-unsafe-assignment`.

## Plugins JS

Os dois plugins rodam no Node, ao lado do Oxlint. As regras de cada um estão no `oxlint.config.ts`; o motivo de cada decisão está nas tabelas abaixo. Contagem do `oxlint -f json` em 18 de novembro de 2026, com a regra ligada e antes das correções. Saídas: (a) autofix, (b) desligada ou com opção no config, (c) corrigida à mão.

### landmines

`@interfere/landmines` 0.1.0, exato. Fica para um PR seguinte o `landmines-style/no-comments`, que este config não registra. O `landmines-types/no-explicit-return-types` fica desligado por decisão do dono em 18 de novembro de 2026: das 676 anotações de retorno, 257 saem sem mudar o tipo, 305 só mantêm o tipo exportado trocando o `return` por uma variável tipada (`const retorno: T = ...; return retorno;`, em 445 lugares) e 49 ficariam anotadas por exceção. A branch `chore/sem-tipo-de-retorno` guarda o codemod aplicado. O plugin só reconhece `vitest`, `@jest/globals` e `jest` como framework de teste, não o `bun:test`: o `mock()` e o `mock.module()` do Bun passam por ele, e o `no-module-mocking` do anti-slop cobre o segundo.

| Regra | Ocorrências | Decisão | Motivo |
| --- | --- | --- | --- |
| `landmines-structure/package-exports` | 24 | (c) | Uma causa só, reportada uma vez por arquivo do pacote: o `"./*": "./src/*.ts"` do `packages/db/package.json`. Ele virou as entradas que alguém importa em `apps` e `packages`: `.`, `schema/comum`, `schema/formatos`, `schema/index`, `seed/dados` e `seed/guarda-local`. Quem precisar de outro arquivo do `@cursos/db` acrescenta a entrada. |
| `landmines-structure/colocated-tests` | 16 | (c) 14, (b) 2 | A regra acha o dono do teste pela pasta dos imports locais. 13 testes de Chromium importavam só o arnês `components/chromium-de-teste.ts`, e o componente testado entra numa string que o `Bun.build` empacota, então a regra tomava o arnês como dono. O arnês virou `components/chromium.test-utils.ts`, o sufixo de companheiro de teste que a regra reconhece (o `bun test` não o descobre como teste). `secao-do-nome.navegador.test.tsx` também importava o `folhaDeExemplo` fora da string e passou a montá-lo dentro do pacote. `cartao-selo-e-rotulo.test.ts` foi para `components/casca/`, ao lado das constantes que ele guarda, e `codigo-gerado.integration.test.ts` foi para `packages/api/src/dominio/`, ao lado do `codigo-do-curso.ts` que ele compara com a migração. `packages/db/src/migracao.integration.test.ts` e `schema/restricoes.integration.test.ts` testam SQL (as migrações e as constraints), sem módulo TS de assunto; o único import local deles é o `urlDeTeste` de `seed/guarda-local.ts`, e a regra fica desligada nos 2 por override. |
| `landmines-testing/no-flake-masking` | 11 | (c) 2, allowlist 9 | Os 2 `15_000` de `consultas/aula.integration.test.ts` saíram. O teste da cota presa soltava a trava num timer fixo de 6 s; agora solta quando a recusa chega, com um timer de reserva em 4,5 s só para a regressão, e caiu de 6,08 s para 3,12 a 3,18 s em 3 rodadas, dentro dos 5 s padrão do `bun test`. O do envio que espera roda em 1,6 s. Allowlist com contagem exata: `.claude/hooks/formatar-arquivo-editado.test.ts` (7), cujos testes rodam o oxfmt e o Oxlint de verdade por `spawnSync` e levaram até 3,4 s com os plugins JS e o load average em 32; e `apps/web/src/equivalencia-dos-tipos.arnes.ts` (2), que roda o `tsc` dos 4 pacotes a cada categoria, 68 s no total. A allowlist acusa quando a contagem do arquivo muda. |
| `landmines-testing/no-test-doubles` | 19 | (c) 13, warn 6 | 12 `spyOn(console, ...).mockImplementation(() => undefined)` e o `console.error =` de `liberacao.integration.test.ts` viraram `spyOn` que só observa: cada teste já lia as chamadas (`toHaveBeenCalledTimes`, `mock.calls`), e o texto do aviso passa a sair na saída do teste. A mensagem do commit "chore: liga as regras de teste do landmines" diz 14; são esses 13. `utils/trpc.test.ts` e `lib/editor.test.ts` pedem redesenho e ficam em warn por override ("O que fica em warn"). |
| `landmines-testing/no-fixed-sleep` | 0 | error | A regra acusa `setTimeout` em `new Promise`, `Bun.sleep` e `scheduler.wait` no corpo do teste; os `sleep` e `esperar` por ajudante passam. |
| `landmines-testing/no-unsignaled-poll` | 0 | error | |
| `landmines-testing/strict-msw` | 0 | error | O repo não usa MSW. |
| `landmines-structure/test-file-names` | 0 | error | `.integration.test.ts`, `.medida.test.tsx` e `.navegador.test.tsx` passam; ajudante de teste leva `.test-utils.ts`. |

### anti-slop

Cópia de `src/` de `dmmulroy/anti-slop` no commit `13909c9`, sem a pasta `effect` (o repo não usa Effect), em `tools/oxlint/anti-slop/`, com a licença e o `ORIGEM.md`. O projeto não publica no npm, e o README dele manda copiar a pasta. O `@oxlint/plugins` fica em 1.94.0, a versão exata do `oxlint`. A pasta sai do Oxlint e do oxfmt pelo `ignorePatterns` e do programa do tsconfig da raiz pelo `exclude` ("Check de tipos"). O `tsconfig.json` dela tem as opções do upstream, mais o `types` e o `include` que o `ORIGEM.md` registra: `bunx tsc -p tools/oxlint/anti-slop/tsconfig.json` passa sem erro, e cada regra tem o teste do `RuleTester` ao lado, que roda com `node tools/oxlint/anti-slop/rules/<regra>.test.ts` na raiz. Os dois ficam fora do `bun run test` e do CI.

A mudança local é o `no-module-mocking`, que só conhecia o `vi` do Vitest e o `jest`. Uma tabela diz que import, com que nome, aceita que métodos, e o `mock` do `bun:test` entra com o `module`; o `mock(() => 1)` e o `mock.restore()` continuam valendo. O teste da regra ganhou 3 casos inválidos e 4 válidos, falhou na regra antiga (`Should have 1 error but had 0`) e passa na nova.

| Regra | Ocorrências | Decisão | Motivo |
| --- | --- | --- | --- |
| `require-readable-spacing` | 4.726 | (a) autofix, error | Os commits "style: aplica o espaçamento do anti-slop" e "style: espaça o arnês dos tipos" só têm o autofix, rodado por um config que liga só essa regra: 4.726 linhas vazias em 435 arquivos (4.675 em 434 no primeiro, 51 no arnês), nenhuma removida, e `git diff -w --ignore-blank-lines` vazio nos dois. |
| `no-module-mocking` | 25 | warn | Os 25 `mock.module` de `apps/web`, que a regra passou a ver. Trocar cada um pede uma costura de dependência no componente; lista em "O que fica em warn". |
| `no-unknown-parameters` | 74 | (b) desligada | Os 15 de produção são erro de `catch` e `.catch`, que o TS tipa como `unknown`, e parser de borda (`paraVolume` do localStorage, `versaoDe` do JSON da versão). A exceção da regra é o parâmetro chamado `cause`, e o repo nomeia `erro`, como no `unicorn/catch-error-name` desligado. Os 58 de teste são dublês e ajudantes; 1 é o hook do Claude Code. |
| `no-known-value-widening` | 41 | (b) desligada | Dois padrões. Tabela `Record<string, T>` indexada por texto de fora (código de erro do Clerk, tecla, entidade HTML, estado do player do YouTube), e objeto devolvido a um tipo de retorno anônimo escrito à mão, que sai com o PR do `no-explicit-return-types`. A fraqueza real que fica: em `apps/web`, sem `noUncheckedIndexedAccess`, a leitura de uma dessas tabelas sai `T`, e não `T \| undefined`; corrigir pede trocar o tipo das tabelas e as leituras delas. |
| `no-runtime-typeof` | 36 | (b) desligada | São 36 sem `allowInTypeGuards` e 32 com ele. A regra pede parser de borda no lugar de `typeof`. Os casos estreitam união conhecida (`searchParams` com `string \| string[] \| undefined`, o valor `number \| number[]` do Slider, o `sucesso` função ou texto do `useAcao`) ou são os parsers de borda à mão (`preferencias.ts`, `consultas/erros.ts`, `versao.ts`). `preferencias.ts` é módulo do cliente, onde o Zod não entra (`zod-no-cliente.test.ts`). |
| `no-unsafe-dictionary-type` | 19 | (b) desligada | `Record<string, unknown>` é o JSON aberto: a resposta do DevTools no arnês do Chromium, o `appearance` do Clerk em `entrada/clerk.ts`, o JSON do localStorage antes do parser e o JSON canônico de `versao.ts`. Os 15 de teste são dublês e fixtures. |
| `no-chained-type-assertions` | 17 | (c) produção, (b) nos testes | `dominio/trechos.ts` fazia `saida as readonly Trecho[] as Trechos` em 3 retornos e `[] as unknown as Trechos` no `SEM_TRECHOS`. Agora o `comoTrechos` é o único cast da marca, e o `no-unsafe-type-assertion` foi de 614 para 611. Os 13 de teste montam dublê de `ClerkClient`, `fetch` e `AuthDoClerk` por `as unknown as` e saem com o redesenho dos dublês. |
| `no-array-filter-map` | 15 | (c) | 11 cadeias (a regra acusa cada par vizinho). 9, só de servidor, de script ou de teste, viraram pipeline de iterador, a forma que ela aceita: `.values().filter().map().toArray()`, ou `matchAll(...)` sem o spread. O `canonizar` de `dominio/trechos.ts` e o `zod-no-cliente.test.ts` viraram `flatMap`. O código que um módulo "use client" alcança não usa iterator helper, porque o Next 16 compila o cliente para chrome 111, edge 111, firefox 111 e safari 16.4 sem polyfill, e eles só existem do Chrome 122, do Firefox 131 e do Safari 18.4 em diante; o `canonizar` roda no player, e `components/iterador-no-cliente.test.ts` acusa a volta. O resultado é o mesmo array: o `canonizar` bate com a versão anterior em 200.000 entradas aleatórias, e `docs/marca/cubo.ts` grava os 3 SVG iguais, byte a byte, aos da versão anterior. |
| `no-reflect-get` | 4 | (c) | `"x" in valor` e a leitura direta, no arnês de tipos e no `trpc.test.ts`. |
| `no-unknown-returns` | 5 | (b) desligada | Os 4 de teste são callback cujo retorno ninguém lê (as `limpezas` do arnês do Chromium, o `violar` das restrições, o `contar` de statements, o procedimento chamado pelo caminho no `admin.test.ts`). O de produção é o `useReverification` do Clerk em `use-acao-da-conta.ts`, cujo tipo apaga o genérico da função que recebe. |
| `no-conditional-empty-object-spread` | 5 | (b) desligada | O spread condicional omite a chave de propósito: o filtro opcional do Drizzle em `consultas/convite.ts` e campos opcionais de fábricas de teste. Trocar por `undefined` muda o objeto, e a regra não tem autofix por isso. |
| `no-object-parameters` | 4 | (b) nos testes | Os 4 são fábricas de `tela-de-conquistas.test.tsx` e `textos.test.ts` que recebem a medalha como `object` e a encaixam por cast. Em produção a regra fica ligada, com 0. |
| `no-shape-in-symbol-names` | 5 | (b) desligada | O repo nomeia em português; os 5 são nomes de terceiros, o atributo SVG `shapeRendering` e o `shape` do `errorFormatter` do tRPC. |
| `no-reduce-accumulator-copy`, `no-reflect-apply`, `no-unknown-type-aliases`, `no-widen-then-assert` e `oxc/no-accumulating-spread` | 0 | error | |
| `require-safety-comment-for-type-assertion` | não medida | desligada | Decisão do dono: pede comentário em cada cast, e o `landmines-style/no-comments` vence (landmines#4). |

### O que fica em warn

`no-test-doubles`, 6 em 2 arquivos, por override:

| Arquivo | Linhas | O que troca |
| --- | --- | --- |
| `apps/web/src/utils/trpc.test.ts` | 61 e 72 | o `fetch` global, por um que grava o pedido (headers, `keepalive`, URL) e nunca responde, e a volta dele no `afterEach` |
| `apps/web/src/lib/editor.test.ts` | 125, 126, 140 e 141 | `requestAnimationFrame`, por um que guarda o quadro, e `document`, por um `getElementById` sobre um `Map`, e a volta dos dois |

`no-module-mocking`, 25 `mock.module` em 22 arquivos de `apps/web/src/components`:

| Módulo trocado | Usos | Arquivos |
| --- | --- | --- |
| `next/navigation` | 19 | `admin/categorias.test.tsx`, `admin/comunicados.test.tsx`, `admin/editor-do-curso.test.tsx`, `admin/editor-do-curso.medida.test.tsx`, `admin/esqueletos.medida.test.tsx`, `admin/material-de-apoio.test.ts`, `admin/pessoas/concessao-de-pontos.test.tsx`, `admin/pessoas/convidar.test.tsx`, `aluno/cartao-continuar.test.tsx`, `aluno/cartao-continuar.medida.test.tsx`, `casca/provedor-da-casca.test.tsx`, `casca/sidebar-na-aula.medida.test.tsx`, `curso/amostra.test.tsx`, `player/player-da-aula.test.tsx`, `player/player-da-aula.navegador.test.tsx`, `player/questionario-da-aula.test.tsx`, `sinal-do-foco.test.tsx`, `trocar-pontos/cartao-de-troca.navegador.test.tsx`, `trocar-pontos/vitrine-sem-troca.test.tsx` |
| `@clerk/nextjs` | 3 | `casca/cartao-de-conta.test.tsx`, `minha-conta/tela-da-minha-conta.test.tsx`, `sinal-do-foco.test.tsx` |
| `@cursos/ui/components/dropdown-menu` | 1 | `casca/cartao-de-conta.test.tsx` |
| `next/headers` | 1 | `sinal-do-foco.test.tsx` |
| `@/server/api` | 1 | `certificado/rotas-do-pdf.test.ts` |

### Custo dos plugins JS

Medido em 18 de novembro de 2026, por `systemd-run --user --same-dir --wait --pipe -p MemoryMax=4G -p MemorySwapMax=4G`, 5 rodadas de cada lado, alternadas, no mesmo código. "Antes" é o `oxlint.config.ts` do commit `1be10e6` com o ignore de `tools/oxlint/anti-slop/**`, para lintar os mesmos 584 arquivos. Parede é o "Service runtime", CPU é o "CPU time consumed" e memória é o "Memory peak" do cgroup. O load average ficou entre 13,5 e 19,1 em 16 núcleos, com outras sessões rodando, então os números absolutos ficam acima dos de "Custo do check de tipos".

| Comando | Parede, mediana (faixa) | CPU, mediana | Pico de memória, mediana | Saída |
| --- | --- | --- | --- | --- |
| `bun run check`, antes | 4,12 s (3,86 a 4,71) | 17,6 s | 823 MB | exit 0 nas 5 |
| `bun run check`, depois | 7,05 s (6,82 a 7,70) | 24,6 s | 897 MB | exit 0 nas 5 |
| `oxlint --fix` do hook em `admin/categorias.tsx`, antes | 1,44 s (1,15 a 1,73) | 4,07 s | 429 MB | exit 0 nas 5 |
| `oxlint --fix` do hook em `admin/categorias.tsx`, depois | 1,97 s (1,81 a 2,07) | 4,97 s | 474 MB | exit 0 nas 5 |

As faixas não se cruzam: o `check` ganha cerca de 3 s de parede e 7 s de CPU, e o hook, cerca de 0,5 s por arquivo editado. Para ver de onde vem, o `oxlint` sozinho rodou 3 vezes em cada config, alternadas:

| Config do `oxlint` | Parede, mediana | CPU, mediana |
| --- | --- | --- |
| antes | 1,92 s | 9,6 s |
| depois | 4,89 s | 16,2 s |
| só o landmines (regras do anti-slop em off) | 4,36 s | 15,0 s |
| só o anti-slop (regras do landmines em off) | 3,44 s | 14,0 s |
| os dois plugins registrados, todas as regras JS em off | 1,56 s, contra 1,16 s do antes na mesma série | 9,2 s, contra 7,8 s |

Registrar os plugins custa cerca de 0,4 s. Ligar qualquer regra JS custa a maior parte, e o custo não soma por plugin: só landmines, 4,36 s; só anti-slop, 3,44 s; os dois, 4,89 s. Inferido, sem perfil: o custo dominante é passar cada arquivo ao Node uma vez, pago quando alguma regra JS está ligada; das regras, a mais cara é a `colocated-tests`, que relê e resolve os imports de cada teste.

## Check de tipos

| Comando | O que checa | Onde roda |
| --- | --- | --- |
| `bun run check-types` | `tsc --noEmit` em `apps/web`, `packages/api`, `packages/db` e `packages/ui`, pelo turbo. É o árbitro do tipo enquanto o tsrs for beta. | CI e máquina |
| `bun run check` | oxfmt (`--check`) e Oxlint com type-aware e `typeCheck` pelo tsrs, com o programa inteiro do tsconfig mais próximo de cada arquivo lintado, inclusive arquivos que o lint ignora | CI, máquina e, arquivo a arquivo, o hook de formato |
| `bun test ./src/equivalencia-dos-tipos.arnes.ts` em `apps/web` | os dois acima contra erros plantados numa cópia do repo, por categoria | só na máquina |

O `check` e o `check-types` concordam em arquivo e código TS em 13 das 15 categorias da prova de equivalência. Divergem em duas, que os tsconfig de hoje não produzem:

- erro global, sem arquivo, e erro de opção do tsconfig (TS2318 e TS5053 com `noLib`): só o `tsc` os devolve;
- erro de declaração (TS4094 com `declaration`): só o `tsc` o devolve.

Fora dos 4 tsconfig, o `tsc` não checa nada e o tsrs também não, pelo `noCheck` descrito em "Escopo". Tirar o `check-types` do CI é decisão do dono, com a tabela da prova de equivalência como base.

O `options.typeCheck` do `oxlint.config.ts` liga o `--type-check`: o Oxlint devolve os diagnósticos do compilador do tsrs como `typescript(TSxxxx)`, com severidade de erro, e o `bun run check` sai com 1. O hook de formato do Claude Code roda o mesmo config no arquivo editado, então também devolve o erro de tipo dele. A exceção é o arquivo que o `ignorePatterns` tira do lint: o hook sai com 0 e não devolve o erro de tipo dele, e o `bun run check` devolve.

### Escopo

O tsrs devolve os erros de todo o programa de cada tsconfig que algum arquivo lintado alcança, e não só os dos arquivos lintados. Para cada arquivo lintado, o tsrs usa o tsconfig mais próximo, e o programa desse tsconfig entra inteiro. Medido em 18 de novembro de 2026: um `export const erroPlantado: number = "texto"` em `packages/ui/src/components/accordion.tsx`, que está no `ignorePatterns` e que nenhum arquivo importa, sai no `oxlint -f json` como `typescript(TS2322)` em `accordion.tsx:79` (584 arquivos lintados), e o `bun run check` sai com 1; sem o plantio, sai com 0. Um arquivo fora de todo tsconfig alcançado não é checado, e por isso o lint e o type check não se separam (issue oxc#16748; o mantenedor recusou separar os dois). Sem ajuste, 26 erros acusavam em arquivos que nenhum dos 4 tsconfig inclui: 14 em `.claude/hooks` (sem os tipos do bun e do node), 11 nos templates da skill `clerk-nextjs-patterns` (sem `@clerk/nextjs` nem React) e 1 em `.railway/railway.ts:64` (TS2353, `variables` no `project`, que o `tsc` nunca checou).

- `.claude/tsconfig.json`, `.railway/tsconfig.json` e `docs/marca/tsconfig.json` estendem o tsconfig da raiz e ligam o `noCheck`. O tsrs não checa tipos nessas pastas, e o lint sintático continua: um `debugger` plantado em `.claude/hooks` e em `docs/marca` acusa, e um `const x: number = "x"` não. Antes, o tsconfig mais próximo delas já era o da raiz, e as outras opções seguem iguais às dele. O editor também lê esses tsconfig, então deixa de mostrar erro de tipo em `.claude`, `.railway` e `docs/marca` (inferido do `noCheck`, não medido no editor).
- Os templates de `.claude/skills/clerk-nextjs-patterns/templates/` trazem o próprio `tsconfig.json`, mais próximo que o de `.claude`, e a skill é travada por hash no `skills-lock.json`. Eles saem do Oxlint pelo `ignorePatterns` (`.claude/skills/*/templates/**`). Perde-se o lint sintático de 3 arquivos de terceiro que o repo não pode editar.
- `tools/oxlint/anti-slop` sai do programa do tsconfig da raiz pelo `exclude`. Sem `include`, esse programa abrange a árvore toda, e o tsrs devolve o erro de todo arquivo dele que nenhum outro tsconfig reivindica: lintando só o `oxlint.config.ts`, saem 4.488 diagnósticos de `apps/web`. Os arquivos de `tools/` não são lintados, ninguém os reivindica, e o `tsconfig.json` deles, com `noCheck` ou sem, não mudava nada: o tsrs devolvia 57 TS5097 (import com `.ts`) e 1 TS2322 de lá.
- O TS2353 de `.railway/railway.ts:64` fica sem decisão: corrigir muda o que o `railway config apply` aplica, e isso é do dono.

### Custo do check de tipos

Medido em 18 de novembro de 2026, por `systemd-run --user --same-dir --wait --pipe -p MemoryMax=4G -p MemorySwapMax=4G`, 5 rodadas alternadas (antes, depois e `check-types` a cada volta), no mesmo código. "Antes" é o `oxlint.config.ts` do commit `215b96e`, sem `typeCheck`. Parede é o "Service runtime", CPU é o "CPU time consumed" e memória é o "Memory peak" do cgroup. O load average ficou entre 9,4 e 11,1 em 16 núcleos, com outras sessões rodando.

| Comando | Parede, mediana (faixa) | CPU, mediana | Pico de memória, mediana (faixa) | Saída |
| --- | --- | --- | --- | --- |
| `bun run check`, antes | 1,51 s (1,49 a 1,80) | 10,4 s | 724 MB (711 a 764) | exit 0 nas 5 |
| `bun run check`, depois | 1,76 s (1,47 a 3,46) | 12,4 s | 820 MB (812 a 841) | exit 0 nas 5 |
| `bun run check-types -- --force` | 2,67 s (2,46 a 3,12) | 16,8 s | 996 MB (967 a 1.007) | exit 0 nas 5 |
| `oxlint --fix` do hook em `admin/categorias.tsx`, antes | 367 ms (334 a 386) | 1,16 s | 302 MB | exit 0 nas 5 |
| `oxlint --fix` do hook em `admin/categorias.tsx`, depois | 625 ms (571 a 2.074) | 1,98 s | 447 MB | exit 0 nas 5 |

- No `bun run check`, a diferença de parede é inconclusiva: as faixas se cruzam, e uma série anterior, com o mesmo arranjo, deu 1,54 s antes e 1,55 s depois. A CPU (+1,9 s) e a memória (+95 MB) sobem nas duas séries. Inferido, sem perfil: o type-aware já monta o programa do tsrs, e o check só acrescenta os diagnósticos do compilador.
- No hook, o check de tipos soma cerca de 260 ms por arquivo editado, porque o tsrs monta o programa do arquivo a cada edição.
- O CI roda os dois em série. Enquanto o `tsc` ficar, o `check` custa ao CI só a diferença acima; tirar o `check-types` economizaria a linha dele.

### Prova de equivalência

`apps/web/src/equivalencia-dos-tipos.arnes.ts` copia o repo (os arquivos do git, o `apps/web/.next/types` e os `env.ts` gerados) para `~/.cache/cursos` (ou `$XDG_CACHE_HOME/cursos`), roda `bun install --frozen-lockfile --ignore-scripts` na cópia e, para cada categoria, planta um erro, roda o `tsc --noEmit` dos 4 pacotes e o `oxlint -f json` da raiz, compara o conjunto de "arquivo e código TS" dos dois e desfaz o plantio. Cada categoria declara os códigos TS esperados de cada lado (`tsc` e `tsrs` em `CATEGORIAS`), e o teste falha se a lista de códigos ou o resultado diferirem. O `tsc` roda com `--listFiles`, e o arnês confere o exit code de cada pacote: 1 com erro, 0 sem. Todo teste exige arquivos checados acima de 0 nos dois lados. O teste do código sem plantio e as categorias em que um lado não acusa nada (`.d.ts` e declaração) levam uma sentinela, a mesma atribuição errada, que os dois lados precisam acusar: um lado parado não passa por "0 erros". Do Oxlint, contam só os `typescript(TSxxxx)` com severidade de erro, os que derrubam o `bun run check`. A cópia fica fora de `node_modules` porque o Oxlint não linta nada sob um caminho com `node_modules` ("No files found to lint"); o arnês falha se o Oxlint lintar 0 arquivos.

O nome não termina em `.test.ts`, então o `bun test` do turbo e o CI não o descobrem. Rode depois do `bunx next typegen`:

```sh
cd apps/web
systemd-run --user --same-dir --wait --pipe -p MemoryMax=4G -p MemorySwapMax=4G --setenv=PATH="$PATH" bun test ./src/equivalencia-dos-tipos.arnes.ts
```

Cada categoria tem o resultado esperado na tabela `CATEGORIAS` do arnês. Um upgrade do Oxlint ou do tsrs que mude um resultado faz o teste falhar, e a tabela abaixo muda junto. Medido em 18 de novembro de 2026, com Oxlint 1.94.0, tsrs 0.25.0-ts7.1.0-beta e TypeScript 7.0.2: 16 pass em 2 rodadas seguidas, 52 s e 54 s de parede, 9 min de CPU e pico de 2,1 GB pelo `systemd-run`. A prova de que o arnês pega um lado parado: com `typeCheck: false` no `oxlint.config.ts`, 16 fail; com o comando do `tsc` trocado por `true`, 16 fail (arquivos checados 0).

| Categoria | Plantio | `tsc` | tsrs | Resultado |
| --- | --- | --- | --- | --- |
| Código sem plantio | nenhum, depois da sentinela | 0 erros | 0 erros | iguais |
| Atribuição errada em `apps/web` | `const x: number = "texto"` em `lib/formulario.ts` | TS2322 | TS2322 | os dois |
| Atribuição errada em `packages/api` | o mesmo em `dominio/limites-do-curso.ts` | TS2322 | TS2322 | os dois |
| `href` de rota inexistente (`typedRoutes`) | `/admin/rota-que-nao-existe` no `not-found.tsx` do admin | TS2322 | TS2322 | os dois |
| `RouteContext` sem `apps/web/.next/types` | a pasta sai | 4 TS2304, um por `route.ts` | os mesmos 4 | os dois |
| Import de módulo inexistente | `export { nada } from "./modulo-que-nao-existe"` | TS2307 | TS2307 | os dois |
| Propriedade inexistente | `"texto".propriedadeQueNaoExiste` | TS2339 | TS2339 | os dois |
| Argumento errado numa procedure do tRPC | `precoVisto: String(preco)` no `botao-de-troca.tsx` | TS2322 | TS2322 | os dois |
| Erro num arquivo de teste | atribuição errada em `lib/formato.test.ts` | TS2322 | TS2322 | os dois |
| Erro dentro de um `.d.ts` | tipo inexistente num `.d.ts` novo, e a sentinela em `lib/formulario.ts` | só o TS2322 da sentinela | só o TS2322 da sentinela | os dois: o `skipLibCheck` dos tsconfig pula todo `.d.ts` |
| Declaração global de um `.d.ts` usada por um `.ts` | `declare global { const PLANTADO: string }` lido como `number` | TS2322 no `.ts` | TS2322 no `.ts` | os dois |
| Erro global, sem arquivo | `noLib` no tsconfig do `packages/ui` | TS2318 global e TS5053 no tsconfig | 52 erros por arquivo (TS17004, TS6142, TS2812, TS2339), sem o TS2318 nem o TS5053 | os dois, com diferença |
| Erro de declaração | `declaration` no tsconfig do `packages/ui` e classe exportada com membro `private` , e a sentinela no mesmo arquivo | TS4094 e o TS2322 da sentinela | só o TS2322 da sentinela | os dois, com diferença: só o `tsc` dá o TS4094 |
| `noUncheckedIndexedAccess` (`api`, `db` e `ui`) | `const n: number = lista[0]` em `packages/api` | TS2322 | TS2322 | os dois |
| `noUnusedLocals` (`api`, `db` e `ui`) | variável local sem uso em `packages/api` | TS6133 | TS6133 | os dois |
| `packages/api` visto pelo programa do web | `caminhoDoCertificado` renomeado em `dominio/rotas.ts`, que só o web importa | TS2305 em `apps/web/src/lib/rotas.ts` | o mesmo | os dois |

As duas divergências batem com a issue oxc#27499: o `--type-check` não devolve os diagnósticos globais (sem arquivo), os de opção do tsconfig nem os de declaração. Nenhuma das duas acontece com os tsconfig de hoje, que não ligam `noLib` nem `declaration`. Na categoria do `.d.ts`, a sentinela prova que os dois rodaram, e a falta de erro no `.d.ts` mostra que os dois respeitam o `skipLibCheck`.
