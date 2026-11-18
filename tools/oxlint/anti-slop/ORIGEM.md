# Origem

Cópia de `src/` do anti-slop, sem a pasta `effect`, porque o repo não usa Effect.

| Campo | Valor |
| --- | --- |
| Repositório | https://github.com/dmmulroy/anti-slop |
| Commit | `13909c9e07590f5a85d93c62712259fe14a883f7` |
| Data do commit | 14 de outubro de 2026 |
| Copiado em | 18 de novembro de 2026 |
| Licença | MIT, em `LICENSE`; o código de `vendor/eslint-stylistic` traz a licença dele |

## Mudanças locais

- `rules/no-module-mocking.ts` também acusa `mock.module(...)` do `bun:test`, com os casos em `rules/no-module-mocking.test.ts`.

## Como atualizar

Copie `src/` de um commit novo por cima desta pasta, sem `effect/`, reaplique as mudanças locais, atualize a tabela e rode os testes das regras com `node tools/oxlint/anti-slop/rules/<regra>.test.ts` na raiz. O `@oxlint/plugins` fica na versão exata do `oxlint`.
