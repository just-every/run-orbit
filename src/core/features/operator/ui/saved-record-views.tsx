import {useEffect,useState} from 'react';
import {recordsRequest,type RecordKind} from './records-api';
import {listFilters,searchFilters,type RecordsSearch} from './records-query';

type Column={key:string;label:string;archived:boolean};
type View={id:string;authorId:string;revision:number;kind:RecordKind;name:string;visibility:'private'|'workspace';q:string;filters:Record<string,string>;columns:string[];sort:{column:string;direction:'asc'|'desc'}};
/** Save list definitions, never a snapshot of the customer rows. */
export function SavedRecordViews({kind,search,query,onSearch,onColumns,onOpen}:{kind:RecordKind;search:RecordsSearch;query:string;onSearch:(next:Partial<RecordsSearch>)=>void;onColumns:(columns:Column[])=>void;onOpen:()=>void}){
 const [reopen,setReopen]=useState(0),[chosen,setChosen]=useState(search.saved??'');
 useEffect(()=>setChosen(search.saved??''),[search.saved,kind]);
 const [views,setViews]=useState<View[]>([]),[columns,setColumns]=useState<Column[]>([]),[current,setCurrent]=useState<View>(),[name,setName]=useState(''),[visibility,setVisibility]=useState<'private'|'workspace'>('private'),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 const defaultColumns=kind==='opportunity'?'title,company_name,stage_name':'name,'+(kind==='contact'?'email':'primary_domain'),defaultSort=kind==='opportunity'?'title':'name';
 const [selected,setSelected]=useState((search.columns??defaultColumns).split(',').filter(Boolean)),[sort,setSort]=useState(search.sort??defaultSort),[direction,setDirection]=useState<'asc'|'desc'>(search.direction??'asc');
 useEffect(()=>setSelected((search.columns??defaultColumns).split(',').filter(Boolean)),[search.columns,kind]);
 useEffect(()=>setSort(search.sort??defaultSort),[search.sort,kind]);useEffect(()=>setDirection(search.direction??'asc'),[search.direction,kind]);
 function options(next:{columns?:string[];sort?:string;direction?:'asc'|'desc'}){const columns=next.columns??selected,column=next.sort??sort,order=next.direction??direction;setSelected(columns);setSort(column);setDirection(order);onSearch({columns:columns.join(','),sort:column,direction:order});}
 async function list(){const result=await recordsRequest<{views:View[];columns:Column[]}>(`records/views?kind=${kind}`);setViews(result.views);setColumns(result.columns);onColumns(result.columns);}
 useEffect(()=>{let active=true;void recordsRequest<{views:View[];columns:Column[]}>(`records/views?kind=${kind}`).then(result=>{if(active){setViews(result.views);setColumns(result.columns);onColumns(result.columns);}}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[kind]);
 useEffect(()=>{let active=true;if(!search.saved){setCurrent(undefined);setName('');setVisibility('private');return;}setError('');void Promise.all([recordsRequest<{view:View}>(`records/views/${search.saved}`),recordsRequest<{views:View[];columns:Column[]}>(`records/views?kind=${kind}`)]).then(([{view},catalog])=>{if(!active)return;setViews(catalog.views);setColumns(catalog.columns);onColumns(catalog.columns);setCurrent(view);setName(view.name);setVisibility(view.visibility);onSearch({q:view.q||undefined,...searchFilters(view.filters),columns:view.columns.join(','),sort:view.sort.column,direction:view.sort.direction});onOpen();}).catch(e=>{if(active){setError(e.message);onOpen();}});return()=>{active=false;};},[search.saved,kind,reopen]);
 const definition=()=>({kind,name,visibility,q:query,filters:listFilters(search),columns:selected,sort:{column:sort,direction}});
 async function save(update:boolean){setBusy(true);setError('');setNotice('');try{const result=await recordsRequest<{view:View}>(`records/views${update&&current?'/'+current.id:''}`,update?'PUT':'POST',update?{revision:current!.revision,view:definition()}:definition());setCurrent(result.view);setChosen(result.view.id);onSearch({saved:result.view.id});await list();setNotice('View saved.');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function remove(){if(!current)return;setBusy(true);setError('');try{await recordsRequest(`records/views/${current.id}`,'DELETE',{revision:current.revision});setChosen('');onSearch({saved:undefined});setCurrent(undefined);await list();setNotice('View deleted.');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <section className="saved-record-views" aria-label="Saved record views">
  <label>Saved view<select aria-label="Saved view" value={chosen} onChange={e=>{setNotice('');setChosen(e.target.value);onSearch({saved:e.target.value||undefined});}}><option value="">Unsaved list</option>{views.map(view=><option key={view.id} value={view.id}>{view.name}{view.visibility==='private'?' · Private':' · Workspace'}</option>)}</select></label>
  <details><summary>View options</summary><div className="saved-record-views__options">
   <label>View name<input value={name} maxLength={100} onChange={e=>setName(e.target.value)}/></label>
   <label>View visibility<select aria-label="View visibility" value={visibility} onChange={e=>setVisibility(e.target.value as 'private'|'workspace')}><option value="private">Private to me</option><option value="workspace">Workspace</option></select></label>
   <label>Sort column<select aria-label="Sort column" value={sort} onChange={e=>options({sort:e.target.value})}>{columns.map(c=><option key={c.key} value={c.key}>{c.label}{c.archived?' (archived)':''}</option>)}</select></label>
   <label>Sort direction<select aria-label="Sort direction" value={direction} onChange={e=>options({direction:e.target.value as 'asc'|'desc'})}><option value="asc">Ascending</option><option value="desc">Descending</option></select></label>
   <fieldset><legend>Visible columns</legend><div className="saved-record-views__columns">{columns.map(column=><label key={column.key}><input type="checkbox" checked={selected.includes(column.key)} onChange={e=>options({columns:e.target.checked?[...selected,column.key]:selected.filter(c=>c!==column.key)})}/>{column.label}{column.archived?' (archived, read-only)':''}</label>)}</div></fieldset>
   <div className="workbench-actions"><button type="button" disabled={busy||!name.trim()||!selected.length} onClick={()=>void save(false)}>Save new view</button>{current?<><button type="button" disabled={busy||!name.trim()||!selected.length} onClick={()=>void save(true)}>Save view changes</button><button type="button" disabled={busy} onClick={()=>void remove()}>Delete view</button><button type="button" disabled={busy} onClick={()=>setReopen(value=>value+1)}>Reopen saved view</button></>:null}</div>
  </div></details>
  {error?<p role="alert">{error}</p>:null}{notice?<p role="status">{notice}</p>:null}
 </section>;
}
