import z from "zod";
import { authedProc, resourceRouter, roledProc } from "../trpc";
import { db } from "../db";
import { ROLES } from "../generated/roles";
import { myInputId, myOutputId, myString } from "../schemas";

const groupSchema = z.object({
  id: myOutputId,

  name: z.string(),
  description: z.string().nullable(),

  deletable: z.boolean(),
}).strip();

const groupUnique = z.object({ id: myInputId }).strict();

const groupCreate = z.object({
  name: myString,
  description: myString.nullish(),
}).strict();

const groupUpdate = groupCreate.partial();

export const groupsRouter = resourceRouter({
  findMany: authedProc
    .input(z.object({ 
      search: myString.optional(),
      limit: z.int().nonnegative().default(100),
      offset: z.int().nonnegative().default(0),
    }).strict())
    .output(z.array(groupSchema))
    .query(async ({ ctx, input }) => {
      const q = db('groups').select('*')
        .limit(input.limit).offset(input.offset)
        .orderBy('_sort');

      if (!ctx.auth!.canDo('view:groups')) {
        q.whereRaw(`id = ANY(get_group_ids_for_user(?))`, [ctx.auth!.user.id]);
      }

      if (input.search) {
        q.whereRaw(`_search @@ create_query(?)`, [input.search]);
      }

      return await q;
    }),

  findUnique: authedProc
    .input(groupUnique)
    .output(groupSchema.nullable())
    .query(async ({ ctx, input }) => {
      const q = db('groups').select('*').where(input);

      if (!ctx.auth!.canDo('view:groups')) {
        q.whereRaw(`id = ANY(get_group_ids_for_user(?))`, [ctx.auth!.user.id]);
      }

      return await q.first() ?? null;
    }),

  create: roledProc('create:groups')
    .input(groupCreate)
    .output(groupSchema)
    .mutation(async ({ input }) => {
      const q = db('groups').insert(input).returning('*');
      return q.then(rows => rows[0]);
    }),

  update: roledProc('modify:groups')
    .input(z.object({
      where: groupUnique,
      data: groupUpdate,
    }).strict())
    .output(groupSchema.nullable())
    .mutation(async ({ input }) => {
      const q = db('groups').update(input.data)
        .where(input.where).returning('*')
        .orderBy('_sort');

      return q.then(rows => rows[0]);
    }),

  delete: roledProc('delete:groups')
    .input(groupUnique)
    .output(groupSchema.nullable())
    .mutation(async ({ input }) => {
      const q = db('groups').delete().where(input).returning('*');
      return q.then(rows => rows[0]);
    }),

  addUserMembers: roledProc('manage:groups')
    .input(z.object({
      group_id: myInputId,
      member_user_ids: z.array(myInputId),
    }).strict())
    .mutation(async ({ input }) => {
      await db('group_member_users').insert(input.member_user_ids.map(id => ({
        group_id: input.group_id,
        member_user_id: id,
      })));
    }),
    
  addGroupMembers: roledProc('manage:groups')
    .input(z.object({
      group_id: myInputId,
      member_group_ids: z.array(myInputId),
    }).strict())
    .mutation(async ({ input }) => {
      await db('group_member_groups').insert(input.member_group_ids.map(id => ({
        group_id: input.group_id,
        member_group_id: id,
      })));
    }),

    
  addRoles: roledProc('manage:roles')
    .input(z.object({
      group_id: myInputId,
      roles: z.array(z.enum(ROLES)),
    }).strict())
    .mutation(async ({ input }) => {
      input.roles = [...new Set(input.roles)];

      await db('group_roles')
        .insert(input.roles.map(role => ({
          group_id: input.group_id,
          role_name: role,
        })))
        .onConflict().ignore();
    }),

  setRoles: roledProc('manage:roles')
    .input(z.object({
      group_id: myInputId,
      roles: z.array(z.enum(ROLES)),
    }).strict())
    .mutation(async ({ input }) => {
      input.roles = [...new Set(input.roles)];

      await db.transaction(async tx => {
        // delete all role assignments for the group
        await tx('group_roles').delete().where({ group_id: input.group_id });
        // then insert the provided ones
        await tx('group_roles').insert(input.roles.map(role => ({
          group_id: input.group_id,
          role_name: role,
        })));
      });
    }),

  revokeRoles: roledProc('manage:roles')
    .input(z.object({
      group_id: myInputId,
      roles: z.array(z.enum(ROLES)),
    }).strict())
    .mutation(async ({ input }) => {
      input.roles = [...new Set(input.roles)];

      await db('group_roles')
        .delete()
        .where('group_id', input.group_id)
        .whereIn('role_name', input.roles);
    }),
});
