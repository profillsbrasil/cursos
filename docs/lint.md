# Lint e formato

O `bun run check` roda a Ultracite 8.3.0, que chama o oxfmt 0.79.0 (`oxfmt --check`) e o Oxlint 1.94.0 (`oxlint`) na raiz. O `bun run fix` roda `oxlint --fix` e `oxfmt --write`. Os configs são `oxlint.config.ts` e `oxfmt.config.ts`, na raiz. O motivo de cada decisão mora neste arquivo, não em comentário no config.

## Cercas de import

O `no-restricted-imports` do `oxlint.config.ts` cerca o banco em `apps/web`: só `src/services.ts` importa `@cursos/db`, e só `src/context.ts` e `src/server/api.ts` importam `@/services`. A mensagem do repo sai no campo `help` do diagnóstico.

## Fora do lint e do formato

- `docs/prototipos`, `.claude/settings.local.json` e `.impeccable/config.json` ficam fora dos dois, como no `biome.jsonc`.
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
| `import(consistent-type-specifier-style)` | 476 | (b) desligada | O fix muda semântica: com `verbatimModuleSyntax`, `import { type A } from "x"` ainda carrega o módulo, e o `import type` que o fix escreve não carrega (4 imports só de tipo estão na forma inline). |
| `eslint(require-unicode-regexp)` | 411 | (b) desligada | O biome.jsonc já desligava (`useUnicodeRegex`): a flag `u` muda o que `.`, `\w` com `i` e as classes negadas casam, e recusa escapes que hoje valem. |
| `unicorn(switch-case-braces)` | 228 | (b) desligada | Estilo: o repo escreve `case` sem chave em 236 lugares e com chave em 21. |
| `eslint(prefer-named-capture-group)` | 178 | (b) desligada | O biome.jsonc já desligava (`useNamedCaptureGroup`): nomear os grupos não muda o que as regex fazem. |
| `unicorn(no-await-expression-member)` | 164 | (b) desligada | Estilo: `(await x).y` é a forma do repo, e a regra não tem autofix. |
| `unicorn(consistent-function-scoping)` | 115 | (b) desligada | Estilo: o repo mantém o ajudante perto de quem o usa; mover de escopo é refatoração sem defeito apontado. |
| `unicorn(no-useless-undefined)` | 97 | (b) desligada | O fix muda semântica: tira o `undefined` do argumento, o que muda o `arguments.length` e quebra o tipo de parâmetro obrigatório `T | undefined`. |
| `unicorn(prefer-string-replace-all)` | 85 | (b) desligada | Estilo: o repo usa `.replace(/.../g)` em 48 lugares e `.replaceAll` em 17. |
| `unicorn(catch-error-name)` | 67 | (b) desligada | Estilo: a regra pede `error`, e o repo nomeia em português (`erro`). |
| `unicorn(import-style)` | 58 | (b) desligada | Estilo: a regra pede import default de `node:path` e afins, e o repo importa por nome. |
| `unicorn(text-encoding-identifier-case)` | 56 | (b) desligada | Estilo: a regra pede `"utf-8"`, e o repo escreve `"utf8"` nos 49 lugares; o Node aceita os dois. |
| `eslint(no-use-before-define)` | 54 | (b) desligada | Estilo: o repo põe o componente exportado em cima e os ajudantes `function` embaixo; o uso antes da declaração de `let` e `const` o `tsc` já recusa. |
| `unicorn(no-array-sort)` | 51 | (b) desligada | O fix muda semântica: `toSorted` não muda o array original e pede ES2023 no navegador. |
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
| `unicorn(no-array-reverse)` | 3 | (b) desligada | O fix muda semântica: `toReversed` não muda o array original e pede ES2023. |
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
