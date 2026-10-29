import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "@tanstack/react-router";
import { MenuLink } from "./menu-link";
import type { OperatorMenu } from "./nav";
import "./operator-menu-sheet.css";

/** The phone menu (900 px and narrower): Menu opens the same menu as a sheet of 48 px rows under the header, over the
 * dimmed page. Opening focuses the first row; Escape or a tap on the dimmed page closes it and returns focus to Menu;
 * choosing a row closes it. Its state lives here, so a background refresh of the page never closes it. */
export function OperatorMenuSheet({ menu, unread }: { menu: OperatorMenu; unread: number }) {
  const [open, setOpen] = useState(false), id = useId(), toggle = useRef<HTMLButtonElement>(null), sheet = useRef<HTMLElement>(null);
  function close() { setOpen(false); toggle.current?.focus(); }
  useEffect(() => {
    if (!open) return;
    sheet.current?.querySelector<HTMLElement>("a, button")?.focus();
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); close(); } };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [open]);
  return <>
    <button ref={toggle} className="operator-menu-toggle" type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>Menu</button>
    {/* The dimmed page sits outside the header, so the lockup and Menu stay bright above it. */}
    {open ? createPortal(<div className="operator-menu-scrim" aria-hidden="true" onClick={close} />, document.body) : null}
    <nav ref={sheet} id={id} className="operator-menu-sheet" aria-label={menu.label} hidden={!open} onClick={(event) => { if ((event.target as HTMLElement).closest("a")) close(); }}>
      {menu.mode === "settings" ? <><Link className="operator-menu-sheet__back" to="/app" activeOptions={{ exact: true, includeSearch: false, includeHash: false }}><span aria-hidden="true">← </span>NOW</Link><p className="operator-menu-sheet__label" aria-hidden="true">Settings</p></> : null}
      {menu.items.map((item) => <MenuLink key={item.path} item={item} current={item === menu.current} unread={unread} />)}
      <hr />
      {menu.end ? <><MenuLink item={menu.end} current={menu.end === menu.current} /><hr /></> : null}
      <form action="/auth/signout" method="post"><button>Sign out</button></form>
    </nav>
  </>;
}
