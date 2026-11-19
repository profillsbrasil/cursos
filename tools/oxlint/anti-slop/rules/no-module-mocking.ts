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

function dynamicImportSource(expression: ESTree.Node): string | null {
  let node = expression;
  if (node.type === "ParenthesizedExpression") node = node.expression;
  if (node.type === "AwaitExpression") node = node.argument;
  if (node.type !== "ImportExpression") return null;
  return node.source.type === "Literal" && typeof node.source.value === "string"
    ? node.source.value
    : null;
}

function namespaceSource(
  sourceCode: SourceCode,
  expression: ESTree.MemberExpression["object"],
): string | null {
  const direct = dynamicImportSource(expression);
  if (direct !== null) return direct;
  if (expression.type !== "Identifier") return null;
  const variable = resolveVariable(sourceCode, expression);
  for (const definition of variable?.defs ?? []) {
    if (
      definition.type === "ImportBinding" &&
      definition.node.type === "ImportNamespaceSpecifier" &&
      definition.parent?.type === "ImportDeclaration"
    ) {
      return definition.parent.source.value;
    }
    if (
      definition.type === "Variable" &&
      definition.node.type === "VariableDeclarator" &&
      definition.node.id.type === "Identifier" &&
      definition.node.init !== null
    ) {
      const source = dynamicImportSource(definition.node.init);
      if (source !== null) return source;
    }
  }
  return null;
}

function destructuredImport(
  definition: ESTree.Node,
  name: string,
): { source: string; exported: string | null } | null {
  if (definition.type !== "VariableDeclarator" || definition.id.type !== "ObjectPattern") {
    return null;
  }
  if (definition.init === null) return null;
  const source = dynamicImportSource(definition.init);
  if (source === null) return null;
  for (const property of definition.id.properties) {
    if (property.type !== "Property") continue;
    const value = property.value.type === "AssignmentPattern" ? property.value.left : property.value;
    if (value.type === "Identifier" && value.name === name) {
      return { exported: propertyName(property.key, property.computed), source };
    }
  }
  return null;
}

function isGlobalMocker(name: string): boolean {
  return name === "vi" || name === "jest";
}

function mockMethodsOf(
  sourceCode: SourceCode,
  expression: ESTree.Expression,
): ReadonlySet<string> | null {
  if (expression.type === "MemberExpression") {
    const source = namespaceSource(sourceCode, expression.object);
    return source === null
      ? null
      : mockerMethods(source, propertyName(expression.property, expression.computed));
  }
  if (expression.type !== "Identifier") return null;
  if (isGlobalMocker(expression.name) && sourceCode.isGlobalReference(expression)) {
    return moduleMockMethods;
  }

  const variable = resolveVariable(sourceCode, expression);
  if (variable === null || variable.defs.length === 0) {
    return isGlobalMocker(expression.name) ? moduleMockMethods : null;
  }
  for (const definition of variable.defs) {
    if (definition.type === "Variable") {
      const destructured = destructuredImport(definition.node, expression.name);
      const methods =
        destructured === null ? null : mockerMethods(destructured.source, destructured.exported);
      if (methods !== null) return methods;
      continue;
    }
    if (definition.type !== "ImportBinding" || definition.parent?.type !== "ImportDeclaration") {
      continue;
    }
    const source = definition.parent.source.value;
    const name = importedName(definition.node);
    const methods = mockerMethods(source, name);
    if (methods !== null) return methods;
  }
  return null;
}

function moduleMockCall(sourceCode: SourceCode, callee: ESTree.Expression): boolean {
  if (!("property" in callee) || !("object" in callee) || !("computed" in callee)) return false;
  const methods = mockMethodsOf(sourceCode, callee.object);
  if (methods === null) return false;
  const property = callee.property;
  const method = callee.computed
    ? property.type === "Literal" && typeof property.value === "string"
      ? property.value
      : null
    : property.type === "Identifier"
      ? property.name
      : null;
  return method !== null && methods.has(method);
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
        if (moduleMockCall(context.sourceCode, node.callee)) {
          context.report({ node, messageId: "moduleMock" });
        }
      },
    };
  },
});
