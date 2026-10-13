import { AuthFrame } from "./auth/AuthFrame";

/** Any address the site does not serve, in the brand's frame. */
export function NotFoundPage() {
  return <AuthFrame layout="centred" numeral={false}>
    <h1>Page not found</h1>
    <p className="ob-auth-foot"><a className="ob-link" href="/">Return home</a></p>
  </AuthFrame>;
}
