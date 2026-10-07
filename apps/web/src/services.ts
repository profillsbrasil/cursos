import { createDb } from "@cursos/db";

import { ENV } from "./env.server";

export const db = createDb(ENV);
