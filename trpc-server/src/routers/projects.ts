import z from "zod";
import { myAddress, myInputId, myOutputId, myString } from "../schemas";
import { authedProc, resourceRouter, roledProc } from "../trpc";
import { db } from "../db";

const projectSchema = z.object({
  id: myOutputId,

  title: z.string(),
  description: z.string(),

  address: myAddress.nullable(),

  customer_id: myOutputId.nullable(),
}).strip();

const projectUnique = z.object({ id: myInputId }).strict();

const projectCreate = z.object({
  title: myString,
  description: myString.nullish(),

  address: myAddress.nullish(),

  customer_id: myInputId.nullish(),
}).strict();

const projectUpdate = projectCreate.partial();

export const projectsRouter = resourceRouter({
  findMany: authedProc
    .input(z.object({
      search: myString.optional(),
      limit: z.int().nonnegative().default(100),
      offset: z.int().nonnegative().default(0),
    }).strict())
    .output(z.array(projectSchema))
    .query(async ({ ctx, input }) => {
      const q = db('projects').select('*')
        .limit(input.limit).offset(input.offset)
        .orderBy('_sort');

      if (!ctx.auth!.canDo('view:projects')) {
        q.whereIn('leader_group_id', ctx.auth!.groupIds)
          .orWhereIn('member_group_id', ctx.auth!.groupIds)
          .orWhereIn('visitor_group_id', ctx.auth!.groupIds)
      }

      if (input.search) {
        q.whereRaw(`_search @@ create_query(?)`, [input.search]);
      }

      return await q;
    }),

  findUnique: authedProc
    .input(projectUnique)
    .output(projectSchema.nullable())
    .query(async ({ ctx, input }) => {
      const q = db('projects').select('*').where(input);

      if (!ctx.auth!.canDo('view:projects')) {
        q.whereIn('leader_group_id', ctx.auth!.groupIds)
          .orWhereIn('member_group_id', ctx.auth!.groupIds)
          .orWhereIn('visitor_group_id', ctx.auth!.groupIds)
      }

      return await q.first() ?? null;
    }),

  create: roledProc('create:projects')
    .input(projectCreate)
    .output(projectSchema)
    .mutation(async ({ input }) => {
      const title = input.title;

      return db.transaction(async tx => {
        const [leaderGroup] = await tx('groups').insert({
          name: `[Leiter] ${title}`,
          deletable: false,
        }).returning('id');

        const [memberGroup] = await tx('groups').insert({
          name: `[Mitglieder] ${title}`,
          deletable: false,
        }).returning('id');

        const [visitorGroup] = await tx('groups').insert({
          name: `[Besucher] ${title}`,
          deletable: false,
        }).returning('id');

        return db('projects').insert({
          ...input,
          leader_group_id: leaderGroup.id,
          member_group_id: memberGroup.id,
          visitor_group_id: visitorGroup.id,
        }).returning('*');
      }).then(rows => rows[0]);
    }),

  update: authedProc
    .input(z.object({
      where: projectUnique,
      data: projectUpdate,
    }).strict())
    .output(projectSchema.nullable())
    .mutation(async ({ ctx, input }) => {
      const title = input.data.title;

      return db.transaction(async tx => {
        const q = tx('projects').update(input.data).where(input.where).returning('*');

        if (!ctx.auth!.canDo('modify:projects')) {
          q.whereIn('leader_group_id', ctx.auth!.groupIds);
        }

        const project = (await q).at(0);
        if (!project) return null;

        if (title) {
          await Promise.all([
            tx('groups').where({ id: project.leader_group_id }).update({
              title: `[Leiter] ${title}`,
            }),
            tx('groups').where({ id: project.member_group_id }).update({
              title: `[Mitglieder] ${title}`,
            }),
            tx('groups').where({ id: project.visitor_group_id }).update({
              title: `[Besucher] ${title}`,
            }),
          ]);
        }

        return project;
      });
    }),

  delete: roledProc('delete:projects')
    .input(projectUnique)
    .output(projectSchema.nullable())
    .mutation(async ({ input }) => {
      const q = db('projects').delete().where(input).returning('*');
      return q.then(rows => rows.at(0) ?? null);
    }),

  finish: authedProc
    .input(projectUnique)
    .mutation(async ({ ctx, input }) => {
      const q = db('projects')
        .update({ finished_at: db.raw('now()') })
        .where({ ...input, finished_at: null });

      if (!ctx.auth!.canDo('modify:projects')) {
        q.whereIn('leader_group_id', ctx.auth!.groupIds);
      }

      await q;
    }),

  unfinish: authedProc
    .input(projectUnique)    
    .mutation(async ({ ctx, input }) => {
      const q = db('projects')
        .update({ finished_at: null })
        .where(input);

      if (!ctx.auth!.canDo('modify:projects')) {
        q.whereIn('leader_group_id', ctx.auth!.groupIds);
      }

      await q;
    }),
});
