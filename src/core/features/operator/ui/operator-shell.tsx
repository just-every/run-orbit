import {NotificationCount} from "./notifications-page";
import {useId,useRef,useState, type PropsWithChildren, type ReactNode} from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { OrbitLockup } from "../../public/ui/brand/OrbitMark";
import { publicProductConfig } from "../../../app/mounts/public-config";

interface OperatorShellProps extends PropsWithChildren {
  eyebrow?: ReactNode;
  title: string;
  action?: ReactNode;
  restricted?: boolean;
  /** For a restricted (collaborator) shell: whether their profile reads Reports. */
  reports?: boolean;
}

/** The console's frame in Orbit's brand: the lockup home, the navigation row with the current page marked, Sign out. */
export function OperatorShell({ action, children, eyebrow, title, restricted=false, reports=true }: OperatorShellProps) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const current = (href: string) => pathname === href ? "page" as const : undefined;
  const [expanded,setExpanded]=useState(false),navigationId=useId(),toggle=useRef<HTMLButtonElement>(null);
  return (
    <div className="operator-shell ob-app">
      <a className="operator-skip-link" href="#operator-main">Skip to content</a>
      <header className="operator-header">
        <a aria-label="Orbit home" className="operator-mark" href="/app"><OrbitLockup name={publicProductConfig.name} imageUrl={publicProductConfig.imageUrl} /></a>
        <button ref={toggle} className="operator-menu-toggle" type="button" aria-expanded={expanded} aria-controls={navigationId} onClick={()=>setExpanded(!expanded)}>Menu</button>
        <nav id={navigationId} aria-label="Operator navigation" className="operator-nav" data-open={expanded} onKeyDown={event=>{if(event.key==='Escape'){setExpanded(false);toggle.current?.focus();}}} onClick={event=>{if((event.target as HTMLElement).closest('a'))setExpanded(false);}}>
          {!restricted&&<><Link to="/app/records">Records</Link>
          <Link activeOptions={{ exact: true }} to="/app">NOW</Link>
          <Link to="/app/settings">Settings</Link>
          <Link to="/app/sources">Sources</Link>
          <Link to="/app/capture">Capture</Link></>}
          {restricted&&<a href="/app/shared-records" aria-current={current("/app/shared-records")}>Shared records</a>}
          {(!restricted||reports)&&<a href="/app/reports" aria-current={current("/app/reports")}>Reports</a>}
          {restricted&&<><a href="/app/access" aria-current={current("/app/access")}>Settings</a>
          <NotificationCount /></>}
          {!restricted&&<><a href="/app/forms" aria-current={current("/app/forms")}>Forms</a>
          <NotificationCount /></>}
        </nav>
        <form className="operator-signout" action="/auth/signout" method="post"><button className="operator-back-link">Sign out</button></form>
      </header>
      <main id="operator-main" tabIndex={-1} className="operator-main">
        <header className="operator-titlebar">
          <div>
            {typeof eyebrow === 'string' ? <p className="operator-eyebrow">{eyebrow}</p> : eyebrow ? <div className="operator-eyebrow">{eyebrow}</div> : null}
            <h1>{title}</h1>
          </div>
          {action ? <div className="operator-titlebar__action">{action}</div> : null}
        </header>
        {children}
      </main>
    </div>
  );
}

export function OperatorState({ children, kind = "info" }: PropsWithChildren<{ kind?: "error" | "info" }>) {
  return <p className={`operator-state operator-state--${kind}`} role={kind === "error" ? "alert" : "status"}>{children}</p>;
}
