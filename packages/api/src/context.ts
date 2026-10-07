import type { SessionAuthObject } from "@clerk/backend";
import type { Database } from "@cursos/db";

export interface Context {
  auth: Pick<SessionAuthObject, "userId"> | null;
  db: Database;
}
