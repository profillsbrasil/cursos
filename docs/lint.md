# Lint e formato

O `bun run check` roda a Ultracite 8.3.0, que chama o oxfmt 0.79.0 (`oxfmt --check`) e o Oxlint 1.94.0 (`oxlint`) na raiz. O Oxlint roda com type-aware e com check de tipos (`options.typeAware` e `options.typeCheck` no `oxlint.config.ts`), e o backend é o tsrs 0.25.0-ts7.1.0-beta (`tsrs --lint headless`), sem o `oxlint-tsgolint` instalado. O `bun run check-types` (`tsc`) continua no CI ao lado, como árbitro, enquanto o tsrs for beta. O `bun run fix` roda `oxlint --fix` e `oxfmt --write`. Os configs são `oxlint.config.ts` e `oxfmt.config.ts`, na raiz. O motivo de cada decisão mora neste arquivo, não em comentário no config.

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
- O Oxlint não linta o código do `shadcn add` (`packages/ui/src/components`, `packages/ui/src/hooks`, `packages/ui/src/lib/utils.ts`) nem `apps/web/public`. O oxfmt formata esses arquivos.
- O oxfmt não formata Markdown (`**/*.md`). O preset Biome da Ultracite já deixava o Markdown de fora; 76 dos 91 arquivos `.md` que o oxfmt mudaria são skills de terceiros travadas por hash no `skills-lock.json`, e o turbo e o `next dev` reescrevem blocos do `AGENTS.md`.
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

`packages/api/src` tem 404 deles e `apps/web/src/components`, 192. O `JSON.parse` de `entrada/clerk.ts` é o sétimo cast de JSON, contado no `no-unsafe-assignment`.

## Check de tipos

O `options.typeCheck` do `oxlint.config.ts` liga o `--type-check`: o Oxlint devolve os diagnósticos do compilador do tsrs como `typescript(TSxxxx)`, com severidade de erro, e o `bun run check` sai com 1. O hook de formato do Claude Code roda o mesmo config no arquivo editado, então também devolve o erro de tipo dele.

### Escopo

O `--type-check` checa os arquivos que o Oxlint linta, não os que os tsconfig listam (issue oxc#16748; o mantenedor recusou separar os dois). Para cada arquivo, o tsrs usa o tsconfig mais próximo. Sem ajuste, 26 erros acusavam em arquivos que nenhum dos 4 tsconfig inclui: 14 em `.claude/hooks` (sem os tipos do bun e do node), 11 nos templates da skill `clerk-nextjs-patterns` (sem `@clerk/nextjs` nem React) e 1 em `.railway/railway.ts:64` (TS2353, `variables` no `project`, que o `tsc` nunca checou).

- `.claude/tsconfig.json`, `.railway/tsconfig.json` e `docs/marca/tsconfig.json` estendem o tsconfig da raiz e ligam o `noCheck`. O tsrs não checa tipos nessas pastas, e o lint sintático continua: um `debugger` plantado em `.claude/hooks` e em `docs/marca` acusa, e um `const x: number = "x"` não. Antes, o tsconfig mais próximo delas já era o da raiz, e as outras opções seguem iguais às dele.
- Os templates de `.claude/skills/clerk-nextjs-patterns/templates/` trazem o próprio `tsconfig.json`, mais próximo que o de `.claude`, e a skill é travada por hash no `skills-lock.json`. Eles saem do Oxlint pelo `ignorePatterns` (`.claude/skills/*/templates/**`). Perde-se o lint sintático de 3 arquivos de terceiro que o repo não pode editar.
- O TS2353 de `.railway/railway.ts:64` fica sem decisão: corrigir muda o que o `railway config apply` aplica, e isso é do dono.

### Prova de equivalência

`apps/web/src/equivalencia-dos-tipos.arnes.ts` copia o repo (os arquivos do git, o `apps/web/.next/types` e os `env.ts` gerados) para `~/.cache/cursos` (ou `$XDG_CACHE_HOME/cursos`), roda `bun install --frozen-lockfile --ignore-scripts` na cópia e, para cada categoria, planta um erro, roda o `tsc --noEmit` dos 4 pacotes e o `oxlint -f json` da raiz, compara o conjunto de "arquivo e código TS" dos dois e desfaz o plantio. Do Oxlint, contam só os `typescript(TSxxxx)` com severidade de erro, os que derrubam o `bun run check`. A cópia fica fora de `node_modules` porque o Oxlint não linta nada sob um caminho com `node_modules` ("No files found to lint"); o arnês falha se o Oxlint lintar 0 arquivos.

O nome não termina em `.test.ts`, então o `bun test` do turbo e o CI não o descobrem. Rode depois do `bunx next typegen`:

```sh
cd apps/web
systemd-run --user --same-dir --wait --pipe -p MemoryMax=4G -p MemorySwapMax=4G --setenv=PATH="$PATH" bun test ./src/equivalencia-dos-tipos.arnes.ts
```

Cada categoria tem o resultado esperado na tabela `CATEGORIAS` do arnês. Um upgrade do Oxlint ou do tsrs que mude um resultado faz o teste falhar, e a tabela abaixo muda junto. Medido em 18 de novembro de 2026, com Oxlint 1.94.0, tsrs 0.25.0-ts7.1.0-beta e TypeScript 7.0.2: 16 pass em 2 rodadas seguidas, 64 s de parede, 9 min de CPU e pico de 2,2 GB pelo `systemd-run`.

| Categoria | Plantio | `tsc` | tsrs | Resultado |
| --- | --- | --- | --- | --- |
| Código sem plantio | nenhum | 0 erros | 0 erros | iguais |
| Atribuição errada em `apps/web` | `const x: number = "texto"` em `lib/formulario.ts` | TS2322 | TS2322 | os dois |
| Atribuição errada em `packages/api` | o mesmo em `dominio/limites-do-curso.ts` | TS2322 | TS2322 | os dois |
| `href` de rota inexistente (`typedRoutes`) | `/admin/rota-que-nao-existe` no `not-found.tsx` do admin | TS2322 | TS2322 | os dois |
| `RouteContext` sem `apps/web/.next/types` | a pasta sai | 4 TS2304, um por `route.ts` | os mesmos 4 | os dois |
| Import de módulo inexistente | `export { nada } from "./modulo-que-nao-existe"` | TS2307 | TS2307 | os dois |
| Propriedade inexistente | `"texto".propriedadeQueNaoExiste` | TS2339 | TS2339 | os dois |
| Argumento errado numa procedure do tRPC | `precoVisto: String(preco)` no `botao-de-troca.tsx` | TS2322 | TS2322 | os dois |
| Erro num arquivo de teste | atribuição errada em `lib/formato.test.ts` | TS2322 | TS2322 | os dois |
| Erro dentro de um `.d.ts` | tipo inexistente num `.d.ts` novo | nada | nada | nenhum dos dois: o `skipLibCheck` dos tsconfig pula todo `.d.ts` |
| Declaração global de um `.d.ts` usada por um `.ts` | `declare global { const PLANTADO: string }` lido como `number` | TS2322 no `.ts` | TS2322 no `.ts` | os dois |
| Erro global, sem arquivo | `noLib` no tsconfig do `packages/ui` | TS2318 global e TS5053 no tsconfig | 52 erros por arquivo (TS17004, TS6142, TS2812, TS2339), sem o TS2318 nem o TS5053 | os dois, com diferença |
| Erro de declaração | `declaration` no tsconfig do `packages/ui` e classe exportada com membro `private` | TS4094 | nada | só o `tsc` |
| `noUncheckedIndexedAccess` (`api`, `db` e `ui`) | `const n: number = lista[0]` em `packages/api` | TS2322 | TS2322 | os dois |
| `noUnusedLocals` (`api`, `db` e `ui`) | variável local sem uso em `packages/api` | TS6133 | TS6133 | os dois |
| `packages/api` visto pelo programa do web | `caminhoDoCertificado` renomeado em `dominio/rotas.ts`, que só o web importa | TS2305 em `apps/web/src/lib/rotas.ts` | o mesmo | os dois |

As duas divergências batem com a issue oxc#27499: o `--type-check` não devolve os diagnósticos globais (sem arquivo), os de opção do tsconfig nem os de declaração. Nenhuma das duas acontece com os tsconfig de hoje, que não ligam `noLib` nem `declaration`. Na categoria do `.d.ts`, "nenhum" não prova o plantio, só que os dois respeitam o `skipLibCheck`.
