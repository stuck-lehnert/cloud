import z from "zod";
import { authedProc, resourceRouter } from "../trpc";
import { db } from "../db";
import { myString } from "../schemas";

const roleSchema = z.object({
  name: z.string(),
  description: z.string().nullable()
}).strip();

const roleUnique = z.object({ name: myString }).strict();

export const rolesRouter = resourceRouter({
  findMany: authedProc
    .input(z.object({
      search: myString.optional(),
      limit: z.int().nonnegative().default(100),
      offset: z.int().nonnegative().default(0),
    }).strict())
    .output(z.array(roleSchema))
    .query(async ({ input }) => {
      const q = db('roles').select('*').limit(input.limit).offset(input.offset);

      if (input.search) {
        q.whereRaw(`_search @@ create_query(?)`, [input.search]);
      }

      return await q;
    }),

  findUnique:authedProc
    .input(roleUnique)
    .output(roleSchema.nullable())
    .query(async ({ input }) => {
      const q = db('roles').select('*').where(input);
      return await q.first() ?? null;
    }),
});
