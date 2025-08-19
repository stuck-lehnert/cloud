export const ROLES = [":admin","view:users","create:users","modify:users","delete:users","view:groups","create:groups","modify:groups","delete:groups","manage:groups","manage:roles","view:projects","create:projects","modify:projects","delete:projects","view:tools","create:tools","modify:tools","delete:tools","track:tools","view:toolTrackings","modify:toolTrackings","delete:toolTrackings","view:products","create:products","modify:products","delete:products"] as const;

export type Role = (typeof ROLES)[number];
