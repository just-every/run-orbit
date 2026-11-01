import {useCallback,useEffect,useState} from 'react';
import {api,useAccessPages} from '../fold-ui/workspace';
import type {SalesSuite} from '../analytics/sales-editor';

/** Reports' one shared read per page: the suite (templates, zone, currency, pipelines, reps, members, canDefine), every
 * definition the viewer may open grouped by id (at most the 100 newest), and whether this viewer and install have a forecast. */
export interface Definition{id:string;version:number;body_json:string;created_at:string}
export interface ReportGroup{id:string;kind:'sales'|'custom';name:string;description:string;versions:Definition[]}
export type ReadyCatalog={state:'ready';suite:SalesSuite;reports:ReportGroup[];full:boolean;forecast:boolean;reload:()=>Promise<void>};
export type Catalog={state:'loading'}|{state:'error';error:string;retry:()=>void}|ReadyCatalog;
export const OPEN_OPPORTUNITIES='open-opportunities';

export function definitionBody(item:Definition):Record<string,unknown>{try{return JSON.parse(item.body_json);}catch{return {};}}
/** Definitions grouped by id in the read's order (newest first), each id's versions newest first, named by its newest version. */
export function groupReports(items:Definition[]):ReportGroup[]{
 const groups=new Map<string,Definition[]>();
 for(const item of items)groups.set(item.id,[...(groups.get(item.id)??[]),item]);
 return [...groups].map(([id,versions])=>{versions.sort((a,b)=>b.version-a.version);const newest=definitionBody(versions[0]!);
  return {id,kind:newest.kind==='sales'?'sales':'custom',name:typeof newest.name==='string'&&newest.name.trim()?newest.name:id,description:typeof newest.description==='string'?newest.description:'',versions};});
}
const pending=new Map<string,Promise<unknown>>();
/** Opening a built-in records its definition: one such write in flight per address, which a repeated open (React's development
 * double effect, a quick second visit) shares instead of racing it. */
export function recordOnce<T>(url:string):Promise<T>{let write=pending.get(url) as Promise<T>|undefined;if(!write){write=api<T>(url,{}).finally(()=>pending.delete(url));pending.set(url,write);}return write;}
/** The ten built-in sales reports and Open opportunities: rows of their own for a viewer who can define. */
export const builtInIds=(suite:SalesSuite)=>new Set([...suite.templates.map(template=>template.id),OPEN_OPPORTUNITIES]);

export function useCatalog(workspace:string):Catalog{
 const {accessClass}=useAccessPages(),base=`/api/v2/workspaces/${encodeURIComponent(workspace)}/operations`;
 const [data,setData]=useState<{suite:SalesSuite;reports:ReportGroup[]}|null>(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 useEffect(()=>{let active=true;setError('');Promise.all([api<SalesSuite>(`${base}/reports/suite`),api<{items:Definition[]}>(`${base}/metrics`)]).then(([suite,list])=>{if(active)setData({suite,reports:groupReports(list.items)});}).catch(cause=>{if(active)setError(cause instanceof Error?cause.message:String(cause));});return()=>{active=false;};},[base,attempt]);
 const reload=useCallback(async()=>{const list=await api<{items:Definition[]}>(`${base}/metrics`);setData(current=>current&&{...current,reports:groupReports(list.items)});},[base]);
 if(error&&!data)return {state:'error',error,retry:()=>setAttempt(value=>value+1)};
 if(!data||accessClass==='pending')return {state:'loading'};
 const full=accessClass==='native_full';
 return {state:'ready',...data,full,forecast:full&&data.suite.currency==='USD',reload};
}
