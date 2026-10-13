import { Link } from "@tanstack/react-router";
import { AuthFrame } from "./auth/AuthFrame";

/** Any address the site does not serve, in the brand's frame. */
export function NotFoundPage() {
  return <AuthFrame layout="centred" numeral={false}>
    <h1>Page not found</h1>
    <p className="ob-auth-foot"><Link className="ob-link" to="/">Return home</Link></p>
  </AuthFrame>;
}
