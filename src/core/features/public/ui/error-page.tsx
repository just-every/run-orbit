import type { ErrorComponentProps } from "@tanstack/react-router";
import { AuthFrame } from "./auth/AuthFrame";

/** An unexpected failure, in the brand's frame: what happened in plain words and a way back. */
export function ErrorPage({ error }: ErrorComponentProps) {
  const detail = error instanceof Error && error.message ? error.message : "";
  return <AuthFrame layout="centred" numeral={false}>
    <h1>This page could not open</h1>
    <p>Orbit ran into a problem showing this page. Try again, or go back to your Orbit home.</p>
    {detail ? <p className="ob-auth-foot">What Orbit reported: {detail}</p> : null}
    <p className="ob-auth-foot"><a className="ob-link" href="">Try again</a> · <a className="ob-link" href="/app">Go to your Orbit home</a> · <a className="ob-link" href="/signin">Sign in again</a></p>
  </AuthFrame>;
}
