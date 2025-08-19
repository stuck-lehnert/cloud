import z from 'zod';
import { db } from '../db';
import { authedProc, publicProc, resourceRouter, roledProc } from '../trpc';
import { ROLES } from '../generated/roles';
import { myInputId, myOutputId, myString } from '../schemas';

const userSchema = z.object({
  id: myOutputId,

  salutation: z.string().nullable(),
  first_name: z.string(),
  last_name: z.string().nullable(),

  username: z.string(),

  phone: z.string().nullable(),
  email: z.string().nullable(),

  disabled_since: z.date().nullable(),

  created_at: z.date(),
  modified_at: z.date(),
}).strip();

const userUnique = z.union([
  z.object({ id: myInputId }).strict(),
  z.object({ username: myString }).strict(),
]);

const userCreate = z.object({
  salutation: myString.nullish(),
  first_name: myString,
  last_name: myString.nullish(),

  username: myString,

  phone: myString.nullish(),
  email: myString.nullish(),
}).strict();

const userUpdate = userCreate.partial();

export const usersRouter = resourceRouter({
  findMany: authedProc
    .input(z.object({
      search: myString.optional(),
      limit: z.int().nonnegative().default(100),
      offset: z.int().nonnegative().default(0),

      only_disabled: z.boolean().default(false),
    }).strict())
    .output(z.array(userSchema))
    .query(async ({ ctx, input }) => {
      const q = db('users').select('*')
        .limit(input.limit).offset(input.offset)
        .orderBy('_sort');

      if (input.search) {
        q.whereRaw(`_search @@ create_query(?)`, [input.search]);
      }

      if (!ctx.auth!.canDo('view:users') || !input.only_disabled) {
        q.where('disabled_since', null);
      }
      
      if (input.only_disabled) {
        q.whereNot('disabled_since', null);
      }

      return await q;
    }),

  findUnique: authedProc
    .input(userUnique)
    .output(userSchema.nullable())
    .query(async ({ input }) => {
      const q = db('users').select('*').where(input);
      return await q.first() ?? null;
    }),

  create: roledProc('create:users')
    .input(userCreate)
    .output(userSchema)
    .mutation(async ({ input }) => {
      const q = db('users').insert(input).returning('*');
      return q.then(rows => rows[0]);
    }),

  update: roledProc('modify:users')
    .input(z.object({
      where: userUnique,
      data: userUpdate,
    }).strict())
    .output(userSchema.nullable())
    .mutation(async ({ input }) => {
      const q = db('users').update(input.data).where(input.where).returning('*');
      return q.then(rows => rows.at(0) ?? null);
    }),

  delete: roledProc('delete:users')
    .input(userUnique)
    .output(userSchema.nullable())
    .mutation(async ({ input }) => {
      const q = db('users').delete().where(input).returning('*');
      return q.then(rows => rows.at(0) ?? null);
    }),

  enable: roledProc(':admin')
    .input(userUnique)
    .mutation(async ({input}) => {
      await db('users')
        .update({ disabled_since: null })
        .where(input);
    }),

  disable: roledProc(':admin')
    .input(userUnique)
    .mutation(async ({ input }) => {
      await db('users')
        .update({ disabled_since: db.raw('now()') })
        .where(input);
    }),

  addRoles: roledProc('manage:roles')
    .input(z.object({
      user_id: myInputId,
      roles: z.array(z.enum(ROLES)),
    }).strict())
    .mutation(async ({ input }) => {
      input.roles = [...new Set(input.roles)];

      await db('user_roles')
        .insert(input.roles.map(role => ({
          user_id: input.user_id,
          role_name: role,
        })))
        .onConflict().ignore();
    }),

  setRoles: roledProc('manage:roles')
    .input(z.object({
      user_id: myInputId,
      roles: z.array(z.enum(ROLES)),
    }).strict())
    .mutation(async ({ input }) => {
      input.roles = [...new Set(input.roles)];
      
      await db.transaction(async tx => {
        // delete all role assignments for the user
        await tx('user_roles').delete().where({ user_id: input.user_id });
        // then insert the provided ones
        await tx('user_roles').insert(input.roles.map(role => ({
          user_id: input.user_id,
          role_name: role,
        })));
      });
    }),

  revokeRoles: roledProc('manage:roles')
    .input(z.object({
      user_id: myInputId,
      roles: z.array(z.enum(ROLES)),
    }).strict())
    .mutation(async ({ input }) => {
      input.roles = [...new Set(input.roles)];

      await db('user_roles')
        .delete()
        .where('user_id', input.user_id)
        .whereIn('role_name', input.roles);
    }),
});

