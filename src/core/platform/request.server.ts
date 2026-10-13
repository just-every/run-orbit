import { env } from "cloudflare:workers";
import { getRequest } from "@tanstack/react-start/server";
import { createDependencies } from "../app/dependencies";
import { operatorFromRequest as admitted } from "../features/identity";
import type { PlatformBindings } from "./assets";
export function requestDependencies() { return createDependencies((env as unknown as PlatformBindings).DB); }
/** Base admission for the current document or server function, with the Worker's normalized bindings. */
export function operatorFromRequest() {
 const bindings = env as unknown as PlatformBindings;
 return admitted(getRequest(), bindings.AUTH_LOCAL === "true" && bindings.RER_DEV_ORIGIN ? { ...bindings, AUTH_ORIGIN: bindings.RER_DEV_ORIGIN } : bindings);
}

export async function archiveRestoring(){const {archiveImportActive}=await import('./archive-maintenance');return archiveImportActive((env as unknown as PlatformBindings).DB);}

export async function requestScopedDependencies(){
 const operator=await operatorFromRequest();if(!operator)throw new Error('Native session required.');
 const {AccessService}=await import('../features/access/service'),{legacyDatabase}=await import('../features/access/legacy-database');
 const db=(env as unknown as PlatformBindings).DB,access=new AccessService(db),actor=await access.authorizeLegacy(operator,crypto.randomUUID());
 return createDependencies(legacyDatabase(db,actor));
}
