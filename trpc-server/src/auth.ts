import * as jose from 'jose';
import { db } from "./db";
import type { Role } from "./generated/roles";

export class AuthResult {
  constructor(
    public readonly user: {
      /** internal id (base-10) */
      id: string;
      username: string;
      phone: string | null;
      email: string | null;
    },

    public readonly session: {
      /** internal id (base-10) */
      id: string;
    },

    public readonly roles: Role[],

    /** internal ids (base-10) */
    public readonly groupIds: string[],
  ) {}

  public isAdmin() {
    return this.roles.includes(':admin');
  }

  public canDo(role: Role) {
    return this.roles.includes(role) || this.isAdmin();
  }
}

export async function authenticate(req: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const authToken = authHeader.substring('Bearer '.length).trim();
  if (!authToken) return null;

  const jwtVerificationResult = await jose
    .jwtVerify(authToken, new TextEncoder().encode(process.env.JWT_SECRET!))
    .catch(() => null);

  if (!jwtVerificationResult) return null;

  const sessionId = jwtVerificationResult.payload.session_id;

  const data = await db('user_sessions s')
    .select({
      session: db.raw(`to_jsonb(s)`),
      user: db.raw(`to_jsonb(u)`),
      roles: db.raw(`get_user_roles(u.id)`),
      group_ids: db.raw(`get_group_ids_for_user(u.id)`),
    })
    .where({ id: sessionId })
    .join('users u', 'u.id', '=', 's.user_id')
    .groupBy('s.id', 'u.id')
    .first();

  if (!data) return null;

  return new AuthResult(
    data.user,
    data.session,
    data.roles,
    data.group_ids,
  );
}
