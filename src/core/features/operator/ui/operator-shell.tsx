import {useUnreadCount} from "./notifications-page";
import { type PropsWithChildren, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { OrbitLockup } from "../../public/ui/brand/OrbitMark";
import { publicProductConfig } from "../../../app/mounts/public-config";
import { operatorMenu } from "./nav";
import { OperatorMenuSheet } from "./operator-menu-sheet";
import { useLeaveGuard } from "./autosave/leave-guard";
import { LeaveNote } from "./autosave/leave-note";
import "./autosave/autosave.css";
import { MenuLink } from "./menu-link";

interface OperatorShellProps extends PropsWithChildren {
  eyebrow?: ReactNode;
  title: string;
  action?: ReactNode;
  restricted?: boolean;
  /** For a restricted (collaborator) shell: whether their profile reads Reports. */
  reports?: boolean;
}

/** The console's frame in Orbit's brand: the lockup, the daily jobs (or, on Settings pages, the Settings areas), Settings
 * and Sign out apart at the right end; at phone width the lockup and Menu, which opens the same menu as a sheet. */
export function OperatorShell({ action, children, eyebrow, title, restricted=false, reports=true }: OperatorShellProps) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const menu = operatorMenu(pathname, restricted, reports), unread = useUnreadCount();
  // Leaving a page waits for its saves; a refused one keeps the page with a note at its top.
  useLeaveGuard();
  return (
    <div className="operator-shell ob-app">
      <a className="operator-skip-link" href="#operator-main">Skip to content</a>
      <header className="operator-header" data-menu={menu.mode}>
        <a aria-label="Orbit home" className="operator-mark" href="/app"><OrbitLockup name={publicProductConfig.name} imageUrl={publicProductConfig.imageUrl} /></a>
        <nav aria-label={menu.label} className="operator-nav">
          {menu.mode === "settings" ? <><Link className="operator-nav__back" to="/app" activeOptions={{ exact: true, includeSearch: false, includeHash: false }}><span aria-hidden="true">← </span>NOW</Link><span className="operator-nav__label" aria-hidden="true">Settings</span></> : null}
          {menu.items.map((item) => <MenuLink key={item.path} item={item} current={item === menu.current} unread={unread} />)}
        </nav>
        <div className="operator-header__end">
          {menu.end ? <MenuLink item={menu.end} current={menu.end === menu.current} /> : null}
          <form className="operator-signout" action="/auth/signout" method="post"><button className="operator-back-link">Sign out</button></form>
        </div>
        <OperatorMenuSheet menu={menu} unread={unread} />
      </header>
      <main id="operator-main" tabIndex={-1} className="operator-main">
        <header className="operator-titlebar">
          <div>
            {typeof eyebrow === 'string' ? <p className="operator-eyebrow">{eyebrow}</p> : eyebrow ? <div className="operator-eyebrow">{eyebrow}</div> : null}
            <h1>{title}</h1>
          </div>
          {action ? <div className="operator-titlebar__action">{action}</div> : null}
        </header>
        <LeaveNote />
        {children}
      </main>
    </div>
  );
}

export function OperatorState({ children, kind = "info" }: PropsWithChildren<{ kind?: "error" | "info" }>) {
  return <p className={`operator-state operator-state--${kind}`} role={kind === "error" ? "alert" : "status"}>{children}</p>;
}
