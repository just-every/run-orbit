import type {ReactNode} from 'react';
import {Link} from '@tanstack/react-router';
// The shared stylesheets load in the dashboard page's order (sales before the dashboard's own), so the records drawer and
// every other shared piece resolve exactly as they do on the dashboard; Reports' own rules come last.
import '../analytics/sales.css';
import '../dashboards/dashboards.css';
import '../dashboards/dashboard-dialogs.css';
import './reports.css';

/** Every Reports page's title block, in the shell's titlebar look: "← Reports" above an opened report, the H1 with the period
 * control after it, the primary action and the options pill at the right, and one quiet line under it when one is true. */
export function ReportsTitle({title,back=true,period,actions,line}:{title:string;back?:boolean;period?:ReactNode;actions?:ReactNode;line?:ReactNode}){
 return <header className="operator-titlebar reports-title">
  <div className="reports-title__head">
   {back&&<p className="operator-eyebrow reports-back"><Link to="/app/reports" activeOptions={{exact:true}}><span aria-hidden="true">←</span>Reports</Link></p>}
   <div className="reports-title__name"><h1>{title}</h1>{period}</div>
  </div>
  {actions&&<div className="reports-title__actions">{actions}</div>}
  {line&&<p className="reports-title__line">{line}</p>}
 </header>;
}

/** A failed read: the server's sentence and Try again, under the title block. */
export function ReadFailure({error,retry,children}:{error:string;retry:()=>void;children?:ReactNode}){
 return <div className="operator-state operator-state--error" role="alert">{error} <button type="button" className="reports-text-button" onClick={retry}>Try again</button>{children}</div>;
}
