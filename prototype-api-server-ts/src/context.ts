import type { AuthResult } from "./lib/auth";

export interface Context {
    auth?: AuthResult | null;
}
