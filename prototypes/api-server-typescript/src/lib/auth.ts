export type Role = string;

export class AuthResult {
    public readonly user: {
        id: Uint8Array;
        first_name: string;
        last_name: string;
        username: string | null;
        password: string | null;
        email: string | null;
        phone: string | null;
    };
    public readonly session: {
        id: Uint8Array;
        inet_addr: string | null;
        user_agent: string | null;
        created_at: Date;
        expires_at: Date;
    };
    public readonly roles: string[];

    constructor({user, session, roles}: {
        user: AuthResult['user'],
        session: AuthResult['session'],
        roles: AuthResult['roles'],
    }) {
        this.user = user;
        this.session = session;
        this.roles = roles;

        this.hasRole = ((role: Role) => this.roles.includes(role)).bind(this);
        this.hasRoles = ((...roles: Role[]) => roles.every(this.hasRole)).bind(this);
        this.hasAnyRole = ((roles: Role[]) => roles.some(this.hasRole)).bind(this);
        this.isAdmin = (() => this.hasRole(':admin')).bind(this);

        this.canDo = ((...roles: Role[]) => this.isAdmin() || this.hasRoles(...roles)).bind(this);
        this.canDoAny = ((...roles: Role[]) => this.isAdmin() || this.hasAnyRole(roles)).bind(this);
    }

    public readonly hasRole: (role: Role) => boolean;
    public readonly hasRoles: (...roles: Role[]) => boolean;
    public readonly hasAnyRole: (roles: Role[]) => boolean;
    public readonly isAdmin: () => boolean;

    public readonly canDo: (...roles: Role[]) => boolean;
    public readonly canDoAny: (...roles: Role[]) => boolean;
}
