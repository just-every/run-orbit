import {RecordsFilters} from './records-filters';
import {RecordsList} from './records-list';
import {RecordOwner} from './record-owner';
import {PipelineBoard} from './pipeline-board';
import './records.css';
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {Link,useElementScrollRestoration,useNavigate,useRouter,useSearch} from '@tanstack/react-router';
import {OperatorShell,OperatorState} from './operator-shell';
import {recordsRequest,type CustomerRecord,type RecordKind} from './records-api';
import {listFilters,listPath,pluralName,searchFilters,type RecordsSearch} from './records-query';

const kinds:RecordKind[]=['opportunity','contact','company'];
const newWords:Record<RecordKind,string>={opportunity:'New opportunity',contact:'New contact',company:'New company'};

/** Records: one list per kind at its own address, its search, filters and view in the address; each row opens its
 * record at the record's own address. */
export function RecordsPage({kind}:{kind:RecordKind}){
 const search=useSearch({strict:false}) as RecordsSearch,navigate=useNavigate(),router=useRouter();
 const filters=listFilters(search),view=kind==='opportunity'&&search.view==='board'?'board':'list';
 const [query,setQuery]=useState(search.q??''),written=useRef(search.q??'');
 const [records,setRecords]=useState<CustomerRecord[]>([]),[settings,setSettings]=useState<any>(),[customers,setCustomers]=useState<boolean>(),[error,setError]=useState(''),[loadedFor,setLoadedFor]=useState(''),[selected,setSelected]=useState<string[]>([]);
 const filtersKey=JSON.stringify([kind,query,filters]),filtered=Boolean(query.trim()||Object.values(filters).some(Boolean)),loading=!error&&loadedFor!==filtersKey;
 // The list's address follows its search, filters and view only while the app is still headed for this list: a record
 // opened meanwhile, its route checks still running, is never replaced by the list.
 function go(next:Partial<RecordsSearch>){if(router.latestLocation.pathname!==listPath[kind])return;void navigate({to:listPath[kind],search:previous=>({...previous,...next}),replace:true});}
 // Typing filters the list at once; the address catches up after a pause, and Back or a link changes the box.
 useEffect(()=>{if(query===written.current)return;const timer=setTimeout(()=>{written.current=query;go({q:query||undefined});},300);return()=>clearTimeout(timer);},[query]);
 useEffect(()=>{if((search.q??'')!==written.current){written.current=search.q??'';setQuery(search.q??'');}},[search.q]);
 useEffect(()=>{setSelected([]);},[filtersKey]);
 const requestId=useRef(0);
 async function reload(){const request=++requestId.current;try{setError('');setLoadedFor('');const [list,workspace]=await Promise.all([recordsRequest<{records:CustomerRecord[]}>(`records/${kind}?${new URLSearchParams({q:query,...filters})}`),settings?Promise.resolve(settings):recordsRequest('settings')]);if(request!==requestId.current)return;setRecords(list.records);setSettings(workspace);setLoadedFor(filtersKey);}catch(e){if(request===requestId.current)setError((e as Error).message);}}
 useEffect(()=>{void reload();return()=>{requestId.current++;};},[filtersKey]);
 // Back to this list: the router restores its scroll as the route renders, before the list's read has answered, so the
 // rows' first render takes the list back to where it was.
 const scroll=useElementScrollRestoration({getElement:()=>window}),restored=useRef(false);
 useLayoutEffect(()=>{if(loading||restored.current)return;restored.current=true;if(scroll)window.scrollTo({top:scroll.scrollY,left:scroll.scrollX});},[loading]);
 // An empty opportunity list says whether there are customers yet, which takes two more reads only then.
 const empty=kind==='opportunity'&&!loading&&!error&&!records.length&&!filtered;
 useEffect(()=>{if(!empty||customers!==undefined)return;void Promise.all([recordsRequest<{records:CustomerRecord[]}>('records/company'),recordsRequest<{records:CustomerRecord[]}>('records/contact')]).then(([companies,contacts])=>setCustomers(companies.records.length+contacts.records.length>0)).catch(()=>setCustomers(true));},[empty]);
 const emptyWords=kind==='opportunity'&&customers===false?'No customers yet. Add your first customer to start tracking opportunities.':`No ${pluralName[kind].toLowerCase()} yet.`;
 return <OperatorShell title="Records" action={<Link className="operator-button" to={`${listPath[kind]}/new`}>{newWords[kind]}</Link>}><div className="records-workspace">
  <nav className="records-tabs" aria-label="Record types">{kinds.map(type=><Link key={type} to={listPath[type]} aria-current={type===kind?'page':undefined}>{pluralName[type]}</Link>)}</nav>
  {error?<OperatorState kind="error">{error}</OperatorState>:null}
  <RecordsFilters query={query} onQuery={setQuery} filters={filters} onFilters={next=>go(searchFilters(next))} settings={settings} opportunities={kind==='opportunity'}/>
  {kind==='opportunity'?<div className="records-tabs" aria-label="Records display">{(['list','board'] as const).map(type=><Link key={type} to={listPath[kind]} search={previous=>({...previous,view:type==='board'?'board':undefined})} replace aria-current={view===type?'page':undefined}>{type==='list'?'List':'Board'}</Link>)}</div>:null}
  {kind!=='opportunity'&&!loading&&!error&&records.length?<label className="record-selection"><input type="checkbox" checked={selected.length===records.length} onChange={e=>setSelected(e.target.checked?records.map(record=>record.id):[])}/>Select visible records</label>:null}
  {kind!=='opportunity'&&selected.length?<RecordOwner key={`bulk-${kind}-${selected.join('-')}`} kind={kind} ids={selected} operators={settings?.operators??[]} onChanged={reload}/>:null}
  {kind==='opportunity'&&view==='board'&&settings?<PipelineBoard records={!loading&&!error?records:[]} settings={settings} pipelineId={filters.pipeline_id??''}/>:<RecordsList kind={kind} records={!loading&&!error?records:[]} settings={settings} selected={selected} onSelected={setSelected}/>}
  {kind==='contact'&&records.some(r=>r.contactability==='do_not_contact')?<p className="records-contactability-note">Orbit never emails a contact marked Do not contact. Imported contacts get this mark unless the file said they agreed to email. Open a contact to see why it is marked and how to change it.</p>:null}
  {loading?<OperatorState>Loading customer records…</OperatorState>:!error&&!records.length?<OperatorState>{filtered?<>No records match your search or filters. <button type="button" onClick={()=>{written.current='';setQuery('');void navigate({to:listPath[kind],search:{},replace:true});}}>Clear search and filters</button></>:emptyWords}</OperatorState>:null}
 </div></OperatorShell>;
}
export const OpportunitiesList=()=><RecordsPage kind="opportunity"/>;
export const ContactsList=()=><RecordsPage kind="contact"/>;
export const CompaniesList=()=><RecordsPage kind="company"/>;
