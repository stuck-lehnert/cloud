import z from 'zod';
import { authedProc, resourceRouter, roledProc } from '../trpc';
import { myInputId, myOutputId, myString } from '../schemas';
import { db } from '../db';

const moreUnits = z.record(z.string(), z.number().nonnegative());

const productSchema = z.object({
  id: myOutputId,

  serial_id: z.int(),

  name: z.string(),
  description: z.string().nullable(),

  base_unit: z.string(),
  more_units: moreUnits,

  created_at: z.date(),
  modified_at: z.date(),
}).strip();

const productUnique = z.union([
  z.object({ id: myInputId }).strict(),
  z.object({ serial_id: z.int().nonnegative() }).strict(),
]);

const productCreate = z.object({
  name: myString,
  description: myString.nullish(),
  base_unit: myString,
  more_units: moreUnits.optional(),
}).strict();

const productUpdate = productCreate.partial();

export const productsRouter = resourceRouter({
  findMany: authedProc
    .input(z.object({
      search: myString.optional(),
      limit: z.int().nonnegative().default(100),
      offset: z.int().nonnegative().default(0),
    }).strict())
    .output(z.array(productSchema))
    .query(async ({ ctx, input }) => {
      const q = db('products').select('*')
        .limit(input.limit).offset(input.offset)
        .orderBy('_sort');

      if (input.search) {
        q.whereRaw(`_search @@ create_query(?)`, [input.search]);
      }

      return await q;
    }),

  findUnique: authedProc
    .input(productUnique)
    .output(productSchema.nullable())
    .query(async ({ input }) => {
      const q = db('products').select('*').where(input);
      return await q.first() ?? null;
    }),

  create: roledProc('create:products')
    .input(productCreate)
    .output(productSchema)
    .mutation(async ({ input }) => {
      const q = db('products').insert(input).returning('*');
      return q.then(rows => rows[0]);
    }),

  update: roledProc('modify:products')
    .input(z.object({
      where: productUnique,
      data: productUpdate,
    }).strict())
    .output(productSchema.nullable())
    .mutation(async ({ input }) => {
      const q = db('products').update(input.data).where(input.where).returning('*');
      return q.then(rows => rows.at(0) ?? null);
    }),

  delete: roledProc('delete:products')
    .input(productUnique)
    .output(productSchema.nullable())
    .mutation(async ({ input }) => {
      const q = db('products').delete().where(input).returning('*');
      return q.then(rows => rows.at(0) ?? null);
    }),
});
