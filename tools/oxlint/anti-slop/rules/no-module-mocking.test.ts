import { RuleTester } from "oxlint/plugins-dev";

import { noModuleMockingRule } from "./no-module-mocking.ts";

const tester = new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } });
const error = { messageId: "moduleMock" };

tester.run("anti-slop/no-module-mocking", noModuleMockingRule, {
  valid: [
    "const store = new InMemoryUserStore();",
    "vi.spyOn(store, 'save');",
    "const vi = { mock() {} }; vi.mock();",
    "function test(jest: { mock(): void }) { jest.mock(); }",
    "import { vi as localVi } from './helpers'; localVi.mock('./module');",
    "import { mock } from 'bun:test'; const dublê = mock(() => 1);",
    "import { mock } from 'bun:test'; mock.restore();",
    "import { mock } from './helpers'; mock.module('./module', () => ({}));",
    "const mock = { module() {} }; mock.module('./module');",
    "const { mock } = await import('./helpers'); mock.module('./module', () => ({}));",
    "const { mock } = await import('bun:test'); const dublê = mock(() => 1);",
    "const bun = await import('bun:test'); bun.mock.restore();",
    "import * as helpers from './helpers'; helpers.mock.module('./module');",
    "const { mock } = require('./helpers'); mock.module('./module');",
    "import { mock } from 'bun:test'; const m2 = mock; m2.restore();",
    "import { mock } from 'bun:test'; const { restore } = mock; restore();",
    "function f(require: (s: string) => { mock: { module(): void } }) { require('bun:test').mock.module(); }",
    "const bt = await import('./helpers'); const { mock } = bt; mock.module('./module');",
  ],
  invalid: [
    { code: "vi.mock('./user-store');", errors: [error] },
    { code: "jest.mock('./user-store');", errors: [error] },
    { code: "vi['doMock']('./user-store');", errors: [error] },
    { code: "jest.unstable_mockModule('./user-store');", errors: [error] },
    { code: "import { vi } from 'vitest'; vi.mock('./user-store');", errors: [error] },
    { code: "import { vi as testApi } from 'vitest'; testApi.mock('./user-store');", errors: [error] },
    {
      code: "import { jest } from '@jest/globals'; jest.mock('./user-store');",
      errors: [error],
    },
    {
      code: "import { mock } from 'bun:test'; mock.module('./user-store', () => ({}));",
      errors: [error],
    },
    {
      code: "import { mock as bunMock } from 'bun:test'; bunMock.module('./user-store', () => ({}));",
      errors: [error],
    },
    {
      code: "import { mock } from 'bun:test'; mock['module']('./user-store', () => ({}));",
      errors: [error],
    },
    {
      code: "const { mock } = await import('bun:test'); mock.module('./user-store', () => ({}));",
      errors: [error],
    },
    {
      code: "const { mock: bunMock } = await import('bun:test'); bunMock.module('./user-store', () => ({}));",
      errors: [error],
    },
    {
      code: "const bun = await import('bun:test'); bun.mock.module('./user-store', () => ({}));",
      errors: [error],
    },
    {
      code: "(await import('bun:test')).mock.module('./user-store', () => ({}));",
      errors: [error],
    },
    {
      code: "import * as bun from 'bun:test'; bun.mock.module('./user-store', () => ({}));",
      errors: [error],
    },
    {
      code: "const { vi } = await import('vitest'); vi.mock('./user-store');",
      errors: [error],
    },
    {
      code: "import * as vitest from 'vitest'; vitest.vi['mock']('./user-store');",
      errors: [error],
    },
    {
      code: "const bt = await import('bun:test'); const { mock } = bt; mock.module('./user-store', () => ({}));",
      errors: [error],
    },
    {
      code: "import * as bt from 'bun:test'; const { mock } = bt; mock.module('./user-store', () => ({}));",
      errors: [error],
    },
    {
      code: "import { mock } from 'bun:test'; const m2 = mock; m2.module('./user-store', () => ({}));",
      errors: [error],
    },
    {
      code: "import { mock } from 'bun:test'; const { module } = mock; module('./user-store', () => ({}));",
      errors: [error],
    },
    {
      code: "const { mock } = require('bun:test'); mock.module('./user-store', () => ({}));",
      errors: [error],
    },
    {
      code: "require('bun:test').mock.module('./user-store', () => ({}));",
      errors: [error],
    },
    {
      code: "const bt = require('bun:test'); bt.mock['module']('./user-store', () => ({}));",
      errors: [error],
    },
    {
      code: "const { mock: { module: trocar } } = await import('bun:test'); trocar('./user-store', () => ({}));",
      errors: [error],
    },
    {
      code: "import { mock } from 'bun:test'; const trocar = mock.module; trocar('./user-store', () => ({}));",
      errors: [error],
    },
    {
      code: "import { vi } from 'vitest'; const { mock } = vi; mock('./user-store');",
      errors: [error],
    },
  ],
});
