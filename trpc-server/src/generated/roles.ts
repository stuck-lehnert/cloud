export const ROLES = [":admin","view:users","create:users","modify:users","delete:users","view:groups","create:groups","modify:groups","delete:groups","manage:groups","manage:roles","view:projects","create:projects","modify:projects","delete:projects","view:tools","create:tools","modify:tools","delete:tools","view:toolTrackings","create:toolTrackings","modify:toolTrackings","delete:toolTrackings"] as const;

export type Role = (typeof ROLES)[number];
