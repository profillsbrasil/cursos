import { defineRule } from "@oxlint/plugins";

import { resolveVariable } from "../shared/scope.ts";

import type { ESTree, SourceCode } from "@oxlint/plugins";

const moduleMockMethods: ReadonlySet<string> = new Set(["doMock", "mock", "unstable_mockModule"]);
const bunModuleMockMethods: ReadonlySet<string> = new Set(["module"]);

const importedMockers: readonly {
  source: string;
  name: string;
  methods: ReadonlySet<string>;
}[] = [
  { source: "vitest", name: "vi", methods: moduleMockMethods },
  { source: "@jest/globals", name: "jest", methods: moduleMockMethods },
  { source: "bun:test", name: "mock", methods: bunModuleMockMethods },
];

/**
 * What an expression holds, as far as module mocking goes: a test framework
 * module (`import * as`, `await import`, `require`), a mocker from it (`vi`,
 * `jest`, bun's `mock`) or a module mocking method of that mocker.
 */
type Held =
  | { kind: "module"; source: string }
  | { kind: "mocker"; methods: ReadonlySet<string> }
  | { kind: "moduleMock" };

const maxDepth = 16;

function importedName(node: ESTree.Node): string | null {
  if (node.type !== "ImportSpecifier") return null;
  return node.imported.type === "Identifier" ? node.imported.name : node.imported.value;
}

function mockerMethods(source: string, name: string | null): ReadonlySet<string> | null {
  const mocker = importedMockers.find(
    (candidate) => candidate.source === source && candidate.name === name,
  );
  return mocker === undefined ? null : mocker.methods;
}

function propertyName(node: ESTree.Node, computed: boolean): string | null {
  if (!computed && node.type === "Identifier") return node.name;
  return node.type === "Literal" && typeof node.value === "string" ? node.value : null;
}

function isGlobalMocker(name: string): boolean {
  return name === "vi" || name === "jest";
}

function member(held: Held | null, name: string | null): Held | null {
  if (held === null || name === null) return null;
  if (held.kind === "module") {
    const methods = mockerMethods(held.source, name);
    return methods === null ? null : { kind: "mocker", methods };
  }
  if (held.kind === "mocker" && held.methods.has(name)) return { kind: "moduleMock" };
  return null;
}

function literalSource(node: ESTree.Node | undefined): string | null {
  return node !== undefined && node.type === "Literal" && typeof node.value === "string"
    ? node.value
    : null;
}

/** The keys from the pattern root down to the binding called `name`, as in `{ mock: { module: trocar } }`. */
function pathTo(pattern: ESTree.Node, name: string): (string | null)[] | null {
  if (pattern.type === "Identifier") return pattern.name === name ? [] : null;
  if (pattern.type === "AssignmentPattern") return pathTo(pattern.left, name);
  if (pattern.type !== "ObjectPattern") return null;
  for (const property of pattern.properties) {
    if (property.type !== "Property") continue;
    const rest = pathTo(property.value, name);
    if (rest !== null) return [propertyName(property.key, property.computed), ...rest];
  }
  return null;
}

function heldByVariable(
  sourceCode: SourceCode,
  identifier: ESTree.IdentifierReference,
  depth: number,
): Held | null {
  if (isGlobalMocker(identifier.name) && sourceCode.isGlobalReference(identifier)) {
    return { kind: "mocker", methods: moduleMockMethods };
  }
  const variable = resolveVariable(sourceCode, identifier);
  if (variable === null || variable.defs.length === 0) {
    return isGlobalMocker(identifier.name) ? { kind: "mocker", methods: moduleMockMethods } : null;
  }
  for (const definition of variable.defs) {
    if (definition.type === "ImportBinding" && definition.parent?.type === "ImportDeclaration") {
      const source = definition.parent.source.value;
      if (definition.node.type === "ImportNamespaceSpecifier") return { kind: "module", source };
      const methods = mockerMethods(source, importedName(definition.node));
      if (methods !== null) return { kind: "mocker", methods };
      continue;
    }
    if (
      definition.type !== "Variable" ||
      definition.node.type !== "VariableDeclarator" ||
      definition.node.init === null
    ) {
      continue;
    }
    const path = pathTo(definition.node.id, identifier.name);
    if (path === null) continue;
    let held = heldBy(sourceCode, definition.node.init, depth + 1);
    for (const key of path) held = member(held, key);
    if (held !== null) return held;
  }
  return null;
}

function declared(sourceCode: SourceCode, identifier: ESTree.IdentifierReference): boolean {
  return (resolveVariable(sourceCode, identifier)?.defs.length ?? 0) > 0;
}

function heldBy(
  sourceCode: SourceCode,
  expression: ESTree.Expression,
  depth: number,
): Held | null {
  if (depth > maxDepth) return null;
  switch (expression.type) {
    case "ParenthesizedExpression":
      return heldBy(sourceCode, expression.expression, depth + 1);
    case "AwaitExpression":
      return heldBy(sourceCode, expression.argument, depth + 1);
    case "ImportExpression": {
      const source = literalSource(expression.source);
      return source === null ? null : { kind: "module", source };
    }
    case "CallExpression": {
      const callee = expression.callee;
      if (callee.type !== "Identifier" || callee.name !== "require") return null;
      if (declared(sourceCode, callee)) return null;
      const source = literalSource(expression.arguments[0]);
      return source === null ? null : { kind: "module", source };
    }
    case "MemberExpression":
      if (expression.object.type === "Super") return null;
      return member(
        heldBy(sourceCode, expression.object, depth + 1),
        propertyName(expression.property, expression.computed),
      );
    case "Identifier":
      return heldByVariable(sourceCode, expression, depth);
    default:
      return null;
  }
}

/** Ban test framework module mocking in favor of real dependency seams. */
export const noModuleMockingRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow Vitest, Jest and bun:test module mocking; tests must replace dependencies through real interfaces.",
    },
    messages: {
      moduleMock:
        "Replace module mocking with dependency injection through a real interface, service layer, or faithful test implementation.",
    },
  },
  createOnce(context) {
    return {
      CallExpression(node) {
        if (node.callee.type === "Super" || node.callee.type === "V8IntrinsicExpression") return;
        if (heldBy(context.sourceCode, node.callee, 0)?.kind === "moduleMock") {
          context.report({ node, messageId: "moduleMock" });
        }
      },
    };
  },
});
