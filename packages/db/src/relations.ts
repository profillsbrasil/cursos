import { defineRelations } from "drizzle-orm";

// biome-ignore lint/performance/noNamespaceImport: defineRelations needs every table in the schema module
import * as schema from "./schema";

export const relations = {
  ...defineRelations(schema),
};
