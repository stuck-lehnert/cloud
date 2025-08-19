import { initTRPC, TRPCError, type AnyMutationProcedure, type AnyQueryProcedure, type TRPC_ERROR_CODE_KEY } from '@trpc/server';
import { log } from './log';
import type { AuthResult } from './auth';
import type { Role } from './generated/roles';
import superjson from 'superjson';

export type Context = {
  auth: AuthResult | null;
};

export const t = initTRPC.context<Context>().create({
  transformer: superjson,  
});

export const router = t.router;

const defaultProc = t.procedure.use(async (opts) => {
  const before = Date.now();
  const result = await opts.next();
  const after = Date.now();

  const durationStr = (after - before).toString().padStart(5, ' ') + 'ms';
  let logMessage = `${durationStr} ${opts.path}`;
  if (!result.ok) logMessage += ' :: ' + result.error.code;
  if (!result.ok) console.log(result.error);
  log(logMessage, new Date(before));

  return result;
});

export const publicProc = defaultProc;

export const authedProc = defaultProc.use(async ({ ctx, next }) => {
  if (!ctx.auth) throw error('UNAUTHORIZED');
  return next();
});

export function roledProc(requiredRole: Role) {
  return authedProc.use(async ({ ctx, next }) => {
    if (!ctx.auth!.canDo(requiredRole)) {
      throw error('FORBIDDEN', `Missing role '${requiredRole}'`);
    }

    return next();
  });
}

type QueryT = AnyQueryProcedure;
type MutationT = AnyMutationProcedure;

export function resourceRouter<
  MethodsT extends {
    findMany?: QueryT;
    findUnique?: QueryT;
    create?: MutationT;
    update?: MutationT;
    delete?: MutationT;
  } & Record<string, QueryT | MutationT>,
>(methods: MethodsT) {
  return router(methods);
};

export function error(code: TRPC_ERROR_CODE_KEY, message?: string) {
  return new TRPCError({ code, message });
}

