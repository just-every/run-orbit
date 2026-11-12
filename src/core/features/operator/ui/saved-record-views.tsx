import {useEffect,useState} from 'react';
import {recordsRequest,type RecordKind} from './records-api';
import {listFilters,searchFilters,type RecordsSearch} from './records-query';

type Column={key:string;label:string;archived:boolean};
type View={id:string;authorId:string;revision:number;kind:RecordKind;name:string;visibility:'private'|'workspace';q:string;filters:Record<string,string>;columns:string[];sort:{column:string;direction:'asc'|'desc'}};
/** Save list definitions, never a snapshot of the customer rows. */
export function SavedRecordViews({kind,search,query,onSearch,onColumns}:{kind:RecordKind;search:RecordsSearch;query:string;onSearch:(next:Partial<RecordsSearch>)=>void;onColumns:(columns:Column[])=>void}){
 const [reopen,setReopen]=useState(0);
 const [views,setViews]=useState<View[]>([]),[columns,setColumns]=useState<Column[]>([]),[current,setCurrent]=useState<View>(),[name,setName]=useState(''),[visibility,setVisibility]=useState<'private'|'workspace'>('private'),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 const selected=(search.columns??(kind==='opportunity'?'title,company_name,stage_name':'name,'+(kind==='contact'?'email':'primary_domain'))).split(',').filter(Boolean),sort=search.sort??(kind==='opportunity'?'title':'name'),direction=search.direction??'asc';
 async function list(){const result=await recordsRequest<{views:View[];columns:Column[]}>(`records/views?kind=${kind}`);setViews(result.views);setColumns(result.columns);onColumns(result.columns);}
 useEffect(()=>{let active=true;void recordsRequest<{views:View[];columns:Column[]}>(`records/views?kind=${kind}`).then(result=>{if(active){setViews(result.views);setColumns(result.columns);onColumns(result.columns);}}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[kind]);
 useEffect(()=>{let active=true;if(!search.saved){setCurrent(undefined);setName('');setVisibility('private');return;}setError('');void recordsRequest<{view:View}>(`records/views/${search.saved}`).then(({view})=>{if(!active)return;setCurrent(view);setName(view.name);setVisibility(view.visibility);onSearch({q:view.q||undefined,...searchFilters(view.filters),columns:view.columns.join(','),sort:view.sort.column,direction:view.sort.direction});}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[search.saved,kind,reopen]);
 const definition=()=>({kind,name,visibility,q:query,filters:listFilters(search),columns:selected,sort:{column:sort,direction}});
 async function save(update:boolean){setBusy(true);setError('');setNotice('');try{const result=await recordsRequest<{view:View}>(`records/views${update&&current?'/'+current.id:''}`,update?'PUT':'POST',update?{revision:current!.revision,view:definition()}:definition());setCurrent(result.view);onSearch({saved:result.view.id});await list();setNotice('View saved.');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function remove(){if(!current)return;setBusy(true);setError('');try{await recordsRequest(`records/views/${current.id}`,'DELETE',{revision:current.revision});onSearch({saved:undefined});setCurrent(undefined);await list();setNotice('View deleted.');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <section className="saved-record-views" aria-label="Saved record views">
  <label>Saved view<select value={search.saved??''} onChange={e=>{setNotice('');onSearch({saved:e.target.value||undefined});}}><option value="">Unsaved list</option>{views.map(view=><option key={view.id} value={view.id}>{view.name}{view.visibility==='private'?' · Private':' · Workspace'}</option>)}</select></label>
  <details><summary>View options</summary><div className="saved-record-views__options">
   <label>View name<input value={name} maxLength={100} onChange={e=>setName(e.target.value)}/></label>
   <label>View visibility<select value={visibility} onChange={e=>setVisibility(e.target.value as 'private'|'workspace')}><option value="private">Private to me</option><option value="workspace">Workspace</option></select></label>
   <label>Sort column<select value={sort} onChange={e=>onSearch({sort:e.target.value})}>{columns.map(c=><option key={c.key} value={c.key}>{c.label}{c.archived?' (archived)':''}</option>)}</select></label>
   <label>Sort direction<select value={direction} onChange={e=>onSearch({direction:e.target.value as 'asc'|'desc'})}><option value="asc">Ascending</option><option value="desc">Descending</option></select></label>
   <fieldset><legend>Visible columns</legend><div className="saved-record-views__columns">{columns.map(column=><label key={column.key}><input type="checkbox" checked={selected.includes(column.key)} onChange={e=>onSearch({columns:(e.target.checked?[...selected,column.key]:selected.filter(c=>c!==column.key)).join(',')})}/>{column.label}{column.archived?' (archived, read-only)':''}</label>)}</div></fieldset>
   <div className="workbench-actions"><button type="button" disabled={busy||!name.trim()||!selected.length} onClick={()=>void save(false)}>Save new view</button>{current?<><button type="button" disabled={busy||!name.trim()||!selected.length} onClick={()=>void save(true)}>Save view changes</button><button type="button" disabled={busy} onClick={()=>void remove()}>Delete view</button><button type="button" disabled={busy} onClick={()=>setReopen(value=>value+1)}>Reopen saved view</button></>:null}</div>
  </div></details>
  {error?<p role="alert">{error}</p>:null}{notice?<p role="status">{notice}</p>:null}
 </section>;
}
