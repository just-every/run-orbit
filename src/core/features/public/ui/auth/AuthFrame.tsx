import type { PropsWithChildren, ReactNode } from "react";
import { Link } from "@tanstack/react-router";

import { publicProductConfig } from "../../../../app/mounts/public-config";
import { OrbitLockup } from "../brand/OrbitMark";
import "./auth.css";

interface AuthFrameProps extends PropsWithChildren {
  /** Sign-in centres the lockup above its card; setup puts it in a top bar beside `action` (Sign out). */
  layout: "centred" | "bar";
  action?: ReactNode;
  /** The giant 01 behind sign-in; pages that are not a way in (a missing page) leave it out. */
  numeral?: boolean;
}

/** The frame of sign-in, first-run setup and the missing-page notice: the brand's paper, the lockup home, one card. */
export function AuthFrame({ action, children, layout, numeral = true }: AuthFrameProps) {
  const { name, imageUrl } = publicProductConfig;
  const home = <Link aria-label={`${name} home`} className="ob-auth-home" to="/"><OrbitLockup name={name} imageUrl={imageUrl} /></Link>;
  return (
    <div className={`ob-site ob-auth ob-auth--${layout}`}>
      {layout === "bar" ? <header className="ob-auth-bar">{home}{action}</header> : null}
      <main className="ob-auth-main">
        {layout === "centred" ? home : null}
        <section className="ob-auth-card">{children}</section>
      </main>
      {layout === "centred" && numeral ? <span className="ob-auth-numeral" aria-hidden="true">01</span> : null}
    </div>
  );
}
