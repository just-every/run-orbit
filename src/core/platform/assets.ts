export interface AssetStore {
  fetch(request: Request): Promise<Response>;
}

export interface PlatformBindings {
  RER_DEMO?: string;
  RER_DEPLOY_SOURCE?: string;
  RER_DEPLOY_FINGERPRINT?: string;
  RER_VERSION?: { id: string };
  RER_MANAGEMENT_ORIGIN?: string;
  RER_INSTALLATION_ID?: string;
  RER_OWNER_CLAIM_ISSUER?: string;
  RER_OWNER_CLAIM_INSTALLATION_ID?: string;
  RER_OWNER_CLAIM_APP_ORIGIN?: string;
  RER_OWNER_CLAIM_PUBLIC_KEYS?: string;
  MAIL_REPLY_TO?: string;
  SENDGRID_UNSUBSCRIBE_GROUP_ID?: string;
  RER_MAIL_RELAY_SECRET?: string;
  SENDGRID_WEBHOOK_PUBLIC_KEY?: string;
  SENDGRID_PARSE_PUBLIC_KEY?: string;
  ORBIT_ENCRYPTION_KEY?: string;
  OPENAI_API_KEY?: string;
  AI_MODEL?: string;
  AI_INPUT_COST_PER_MILLION?: string;
  AI_CACHED_INPUT_COST_PER_MILLION?: string;
  AI_OUTPUT_COST_PER_MILLION?: string;
  AUTH_ORIGIN?: string;
  AUTH_LOCAL?: string;
  MAIL_PROVIDER?: string;
  OWNER_EMAIL?: string;
  SETUP_TOKEN?: string;
  SESSION_SECRET?: string;
  RER_DEV_ORIGIN?: string;
  /** The checkout's local dev key; only local runtimes receive it and `rer deploy` refuses it. */
  RER_DEV_KEY?: string;
  /** `off` under `rer dev --login`: dev sign-in and personas answer 404. */
  RER_DEV_IDENTITY?: string;
  /** The optional oidc-provider@1 address (an Auth install) this app links to. */
  IDENTITY_PROVIDER?: string;
  MAIL_FROM?: string;
  SENDGRID_API_KEY?: string;
  ASSETS: Fetcher;
  DB: D1Database;
}

export function createAssetStore(bindings: PlatformBindings): AssetStore {
  return {
    fetch: (request) => bindings.ASSETS.fetch(request)
  };
}
