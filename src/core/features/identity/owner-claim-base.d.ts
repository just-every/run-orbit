// Types for Base's shared transport helpers; runtime remains in the pinned package.
declare module '@runeditrun/rer/internal/modules/owner-claim/verify.mjs' {
  import type {OwnerClaimConfig} from '@runeditrun/rer/modules/owner-claim';
  export function configureClaim(input: unknown): Readonly<OwnerClaimConfig>;
}
declare module '@runeditrun/rer/internal/modules/owner-claim/page.mjs' {
  import type {OwnerClaimConfig} from '@runeditrun/rer/modules/owner-claim';
  export function confirmationPage(config: OwnerClaimConfig, head?: boolean): Response;
}
declare module '@runeditrun/rer/internal/modules/operator-auth/http.mjs' {
  import type {AuthConfig} from '@runeditrun/rer/modules/operator-auth';
  export function requireOrigin(request: Request, config: AuthConfig): void;
  export function requirePost(request: Request, config: AuthConfig): void;
}
declare module '@runeditrun/rer/internal/modules/operator-auth/input.mjs' {
  export function readInput(request: Request): Promise<Record<string, unknown>>;
}
