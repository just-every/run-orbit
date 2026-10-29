import { Link } from "@tanstack/react-router";
import type { NavItem } from "./nav";

/** One menu entry. Link marks only an exact match itself, so the menu's own current item is the only one marked (DL6). */
export function MenuLink({ item, current, unread, className }: { item: NavItem; current: boolean; unread?: number; className?: string }) {
  const count = item.path === "/app/notifications" && unread ? unread : 0;
  return <Link className={className} to={item.path} activeOptions={{ exact: true, includeSearch: false, includeHash: false }} aria-current={current ? "page" : undefined} aria-label={count ? `${item.label}, ${count} unread` : undefined}>
    {item.label}{count ? <span className="operator-nav__count" aria-hidden="true">{count}</span> : null}
  </Link>;
}
