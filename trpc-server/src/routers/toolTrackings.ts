import z from 'zod';
import {authedProc, resourceRouter, roledProc} from '../trpc';
import { myInputId, myOutputId } from '../schemas';
import { db } from '../db';

const toolTrackingSchema = z.object({
  id: myOutputId,

  tool_id: myOutputId,
  project_id: myOutputId.nullable(),
  responsible_user_id: myOutputId.nullable(),

  started_by_user_id: myOutputId.nullable(),
  ended_by_user_id: myOutputId.nullable(),

  started_at: z.date(),
  ended_at: z.date().nullable(),
  deadline_at: z.date().nullable(),
}).strict();

export const toolTrackingsRouter = resourceRouter({
  myCurrent: authedProc
    .input(z.object({
      limit: z.int().nonnegative().default(100),
      offset: z.int().nonnegative().default(0),
    }).strict())
    .output(z.array(toolTrackingSchema))
    .query(async ({ ctx, input }) => {
      const q = db('tool_trackings').select('*')
        .limit(input.limit).offset(input.offset)
        .orderBy('_sort');
        
      q.where({
        responsible_user_id: ctx.auth!.user.id,
        ended_at: null,
      });

      return await q;
    }),

  myHistory: authedProc
    .input(z.object({
      limit: z.int().nonnegative().default(100),
      offset: z.int().nonnegative().default(0),
    }).strict())
    .output(z.array(toolTrackingSchema))
    .query(async ({ ctx, input }) => {
      const q = db('tool_trackings').select('*')
        .limit(input.limit).offset(input.offset)
        .orderBy('_sort');
        
      q.where({ responsible_user_id: ctx.auth!.user.id });
      q.whereNot('ended_at', null);

      return await q;
    }),

  globalLog: roledProc('view:toolTrackings')
    .input(z.object({
      limit: z.int().nonnegative().default(100),
      offset: z.int().nonnegative().default(0),
    }))
    .output(z.array(toolTrackingSchema))
    .query(async ({ input }) => {
      return await db('tool_trackings').select('*')
        .limit(input.limit).offset(input.offset)
        .orderBy('_sort');
    }),

  delete: roledProc('delete:toolTrackings')
    .input(z.object({ id:myInputId }).strict())
    .mutation(async ({ input }) => {
      await db('tool_trackings').delete().where(input);
    }),
});
