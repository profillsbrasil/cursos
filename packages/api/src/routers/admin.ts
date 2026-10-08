import { visaoDoCatalogo } from "../consultas/catalogo";
import { adminProcedure, router } from "../index";

// Todo procedimento daqui usa adminProcedure; routers/admin.test.ts percorre a árvore e confere.
export const adminRouter = router({
  catalogo: router({
    visao: adminProcedure.query(({ ctx }) => visaoDoCatalogo(ctx.db)),
  }),
});
