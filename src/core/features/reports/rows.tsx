import {useId,type ReactNode} from 'react';
import {Link} from '@tanstack/react-router';
import {DashboardIcon} from '../dashboards/icons';

/** One row for everything that opens: the whole row is one link holding the name, at most one quiet line and a chevron. A row
 * action (the dashboard default) sits at the row's right, outside the link. */
export type RowTarget={to:'/app/reports/$id';params:{id:string};search?:{version?:number}}|{to:'/app/reports/forecast'}|{to:'/app/dashboards/$id';params:{id:string}};
export function Row({target,name,line,action,replace}:{target:RowTarget;name:string;line?:string;action?:ReactNode;replace?:boolean}){
 const id=useId();
 return <li className="reports-row">
  <Link {...target} replace={replace} className="reports-row__link" aria-labelledby={`${id}-name`} aria-describedby={line?`${id}-line`:undefined}>
   <span className="reports-row__text"><span id={`${id}-name`} className="reports-row__name">{name}</span>{line&&<span id={`${id}-line`} className="reports-row__line">{line}</span>}</span>
   <DashboardIcon kind="chevron"/>
  </Link>
  {action}
 </li>;
}

/** The row of what is open now: the same row, marked current, with nothing to follow. */
export function CurrentRow({name,line}:{name:string;line:string}){
 return <li className="reports-row" aria-current="true"><span className="reports-row__link"><span className="reports-row__text"><span className="reports-row__name">{name}</span><span className="reports-row__line">{line}</span></span></span></li>;
}
