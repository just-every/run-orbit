import type { Context } from "hono";

export function redirectToSignIn(context: Context): Response {
  const requestUrl = new URL(context.req.url);
  const signInUrl = new URL("/signin", requestUrl.origin);
  signInUrl.searchParams.set("returnTo", `${requestUrl.pathname}${requestUrl.search}`);

  return context.redirect(`${signInUrl.pathname}${signInUrl.search}`, 302);
}
