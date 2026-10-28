import {DashboardIcon} from './icons';
import {dashboardLocal,dashboardZone} from './display';
import {DashboardDefaultMenu} from './default-menu';
import type {DashboardView} from './repository';
/** Orbit's title block: eyebrow, title and hairline, the meta, access and sharing lines, and the actions on the title row. */
export function DashboardTitle({view,pdfUrl,onShare,onSchedule,onEdit,onDefault}:{view:DashboardView;pdfUrl:string;onShare:()=>void;onSchedule:()=>void;onEdit:()=>void;onDefault:(enabled:boolean)=>Promise<void>}){
 const empty=view.tiles.length===0,meta=[view.owner?`Owner ${view.owner}`:null,`version ${view.version}`,`${view.tiles.length} of 24 tiles`,dashboardZone(view.timezone),view.currency,view.pending?'Computing under your access…':`Computed ${dashboardLocal(view.computedAt,view.timezone)} from current records`].filter(Boolean).join(' · ');
 return <header className="operator-titlebar dash-title">
  <div className="dash-title__head"><p className="operator-eyebrow"><a href="/app/reports">Reports</a> / Dashboards</p><h1>{view.name}</h1></div>
  <div className="dash-actions">{view.canManage&&<button type="button" className="ob-pill" onClick={onShare}>Share</button>}{view.canManage&&<button type="button" className="dash-outline" onClick={onSchedule}>Schedule email</button>}{!empty&&<a href={pdfUrl} className="dash-outline">Export PDF</a>}{!empty&&view.canEdit&&<button type="button" className="dash-outline" onClick={onEdit}>Edit tiles</button>}<DashboardDefaultMenu isDefault={view.isDefault} onChange={onDefault}/></div>
  <div className="dash-title__lines"><p className="dash-title-meta">{meta}</p><div className="dash-access">{view.limited&&<span className="ob-chip dash-chip"><DashboardIcon kind="lock"/>Limited to your access</span>}<p>{view.access}</p></div><p className="dash-sharing">{view.canManage?<button type="button" className="dash-text-button" onClick={onShare}><DashboardIcon kind="share"/>{view.sharing}</button>:<><DashboardIcon kind="share"/>{view.sharing}</>}</p></div>
 </header>;
}
