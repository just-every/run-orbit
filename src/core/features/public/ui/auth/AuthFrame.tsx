import { HydrationUnit } from '../../../../../base/hydration/unit';
import type { PropsWithChildren, ReactNode } from "react";

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
  const home = <HydrationUnit><a aria-label={`${name} home`} className="ob-auth-home" href="/"><OrbitLockup name={name} imageUrl={imageUrl} /></a></HydrationUnit>;
  return (
    <div className={`ob-site ob-auth ob-auth--${layout}`}>
      {layout === "bar" ? <HydrationUnit><header className="ob-auth-bar">{home}{action}</header></HydrationUnit> : null}
      <main className="ob-auth-main">
        {layout === "centred" ? home : null}
        <HydrationUnit><section className="ob-auth-card">{children}</section></HydrationUnit>
      </main>
      {layout === "centred" && numeral ? <span className="ob-auth-numeral" aria-hidden="true">01</span> : null}
    </div>
  );
}
