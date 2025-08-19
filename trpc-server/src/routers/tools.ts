import z from "zod";
import { authedProc, resourceRouter, roledProc } from "../trpc";
import { myInputId, myOutputId, myString } from "../schemas";
import { db } from "../db";
import type { Knex } from "knex";

const toolSchema = z.object({
  id: myOutputId,

  custom_id: z.int(),
  brand: z.string(),
  category: z.string(),
  label: z.string().nullable(),

  available: z.boolean().optional(),

  archived_since: z.date().nullable(),

  created_at: z.date(),
  modified_at: z.date(),
}).strip();

const toolUnique = z.union([
  z.object({ id: myInputId }).strict(),
  z.object({ custom_id: z.int().nonnegative() }).strict(),
]);

const toolCreate = z.object({
  custom_id: z.int().nonnegative(),
  brand: myString,
  category: myString,
  label: myString.nullish(),
}).strict();

const toolUpdate = toolCreate.partial().omit({ custom_id: true });

function applyUnique(where: z.infer<typeof toolUnique>, query: Knex.QueryBuilder) {
  if ('id' in where) {
    query.where('id', where.id);
  } else {
    query.where('custom_id', where.custom_id);
    query.where('archived_since', null);
  }
}

export const toolsRouter = resourceRouter({
  findMany: authedProc
    .input(z.object({
      search: myString.optional(),
      limit: z.int().nonnegative().default(100),
      offset: z.int().nonnegative().default(0),

      brand: myString.optional(),
      category: myString.optional(),
    }).strict())
    .output(z.array(toolSchema))
    .query(async ({ ctx, input }) => {
      const q = db('tools AS t')
        .select('t.*', 'tt IS NULL AS available')
        .limit(input.limit).offset(input.offset)
        .orderBy('t._sort');

      q.leftJoin(
        'tool_trackings AS tt',
        db.raw('tt.tool_id = t.id AND tt.ended_at IS NULL'),
      );

      // if no permission, allow to view tools related to active responsible trackings
      if (!ctx.auth!.canDo('view:tools')) {
        q.where('tt.responsible_id', ctx.auth!.user.id);
      }

      if (input.search) {
        q.whereRaw(`t._search @@ create_query(?)`, [input.search]);
      }

      if (input.brand) q.where('t.brand', input.brand);
      if (input.category) q.where('t.category', input.category);

      return await q;
    }),

  findUnique: authedProc
    .input(toolUnique)
    .output(toolSchema.nullable())
    .query(async ({ ctx, input }) => {
      const q = db('tools AS t').select('t.*', 'tt IS NULL AS available');

      q.leftJoin(
        'tool_trackings AS tt',
        db.raw('tt.tool_id = t.id AND tt.ended_at IS NULL'),
      );

      applyUnique(input, q);

      // if no permission, allow to view tools related to active responsible trackings
      if (!ctx.auth!.canDo('view:tools')) {
        q.where('tt.responsible_id', ctx.auth!.user.id);
      }

      return await q.first() ?? null;
    }),

  create: roledProc('create:tools')
    .input(toolCreate)
    .output(toolSchema)
    .mutation(async ({ input }) => {
      const q = db('tools').insert(input).returning('*');
      return q.then(rows => rows[0]);
    }),

  update: roledProc('modify:tools')
    .input(z.object({
      where: toolUnique,
      data: toolUpdate,
    }).strict())
    .output(toolSchema.nullable())
    .mutation(async ({ input }) => {
      const q = db('tools').update(input.data).returning('*');
      applyUnique(input.where, q);
      return q.then(rows => rows.at(0) ?? null);
    }),

  delete: roledProc('delete:tools')
    .input(toolUnique)
    .output(toolSchema.nullable())
    .mutation(async ({ input }) => {
      const q = db('tools').delete().returning('*');
      applyUnique(input, q);
      return q.then(rows => rows.at(0) ?? null);
    }),

  archive: roledProc('modify:tools')
    .input(toolUnique)
    .mutation(async ({ input }) => {
      const q = db('tools')
        .update({ archived_since: db.raw('now()') })
        .where('archived_since', null);

      applyUnique(input, q);

      await q;
    }),

  unarchive: roledProc('modify:tools')
    .input(z.object({ id: myInputId }).strict())
    .mutation(async ({ input }) => {
      await db('tools')
        .update({ archived_since: null })
        .where(input);
    }),

  /**
   * Track the given tools (specified by `tool_ids`).
   * - Stores the given parameters within the created `tool_tracking` instance.
   * - Automatically ends any active trackings before creating new ones.
   * - Records failed tool ids in `failed_tool_ids`.
   */
  track: roledProc('track:tools')
    .input(z.object({
      tool_ids: z.array(myInputId),
      responsible_user_id: myInputId.nullish(),
      project_id: myInputId.nullish(),
      deadline: z.coerce.date().nullish(),
    }).strict())
    .output(z.object({
      failed_tool_ids: z.array(myOutputId),
    }).strip())
    .mutation(async ({ ctx, input }) => {
      input.tool_ids = [...new Set(input.tool_ids)];

      const failed_tool_ids: string[] = [];

      for (const tool_id of input.tool_ids) {
        await db.transaction(async tx => {
          // end any active tracking
          await tx('tool_trackings').update({
            ended_at: tx.raw('now()'),
            ended_by_user_id: ctx.auth!.user.id,
          }).where({
            tool_id,
            ended_at: null,
          });

          // create new tracking
          await tx('tool_trackings').insert({
            tool_id,

            project_id: input.project_id ?? null,
            responsible_user_id: input.responsible_user_id ?? null,
            deadline_at: input.deadline ?? null,

            started_by_user_id: ctx.auth!.user.id,
          });
        }).catch(e => {
          // track failed
          failed_tool_ids.push(tool_id);
        });
      }

      return { failed_tool_ids };
    }),

  untrack: roledProc('track:tools')
    .input(z.object({ tool_id: myInputId }).strict())
    .mutation(async ({ ctx, input }) => {
      await db('tool_trackings').update({
        ended_at: db.raw('now()'),
        ended_by_user_id: ctx.auth!.user.id,
      }).where({
        tool_id: input.tool_id,
        ended_at: null,
      });
    }),
});
