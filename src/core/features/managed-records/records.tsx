import {useEffect,useRef,useState} from 'react';
import {recordsRequest} from '../operator/ui/records-api';
import {OperatorState} from '../operator/ui/operator-shell';
import type {DefinitionsResponse,ManagedProjection} from './contracts';
import {ManagedRecordForm} from './record-form';
import './styles.css';

/** Everyday Records and Shared records embed this same currently scoped surface. */
export function ManagedRecords(){
 const [access,setAccess]=useState<DefinitionsResponse>(),[kind,setKind]=useState('lead'),[query,setQuery]=useState(''),[items,setItems]=useState<ManagedProjection[]>([]),[cursor,setCursor]=useState<string|null>(null),[owners,setOwners]=useState<{id:string;name:string}[]>([]),[record,setRecord]=useState<ManagedProjection>(),[editing,setEditing]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false),[confirmDelete,setConfirmDelete]=useState(false);
 const generation=useRef(0),type=access?.types.find(t=>t.name===kind);
 async function initialize(){const [definitions,people]=await Promise.all([recordsRequest<DefinitionsResponse>('managed-records/definitions'),recordsRequest<{owners:{id:string;name:string}[]}>('managed-records/owners')]);setAccess(definitions);setOwners(people.owners);return definitions;}
 useEffect(()=>{let alive=true;void initialize().catch(e=>{if(alive)setError(e.message);});return()=>{alive=false;};},[]);
 async function load(more=false){
  const current=++generation.current;setBusy(true);setError('');if(!more){setLoaded(false);setItems([]);setCursor(null);}
  try{const params=new URLSearchParams({q:query});if(more&&cursor)params.set('cursor',cursor);const result=await recordsRequest<{items:ManagedProjection[];nextCursor:string|null}>('managed-records/'+kind+'?'+params);if(current!==generation.current)return;setItems(previous=>more?[...previous,...result.items]:result.items);setCursor(result.nextCursor);setLoaded(true);}
  catch(e){if(current===generation.current)setError((e as Error).message);}finally{if(current===generation.current)setBusy(false);}
 }
 useEffect(()=>{setRecord(undefined);setEditing(false);setConfirmDelete(false);setNotice('');void load();return()=>{generation.current++;};},[kind,query]);
 async function open(id:string){setError('');setEditing(false);setConfirmDelete(false);try{setRecord(await recordsRequest<ManagedProjection>('managed-records/'+kind+'/'+id));}catch(e){setRecord(undefined);setError((e as Error).message);}}
 async function saved(){setEditing(false);setRecord(undefined);setNotice('Record saved');await initialize();await load();}
 async function remove(){if(!record||busy)return;setBusy(true);setError('');try{await recordsRequest('managed-records/'+kind+'/'+record.ref.id,'DELETE',{confirmed:true,revision:record.ref.revision});setConfirmDelete(false);setRecord(undefined);setNotice('Record deleted');await load();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <section className="operator-surface workbench-form managed-records" aria-label="Leads and custom records"><h2>Leads and custom records</h2>
  <p>Work with records you own or can access through your role and current shares.</p>{error&&<OperatorState kind="error">{error}<button type="button" onClick={()=>{void initialize().then(()=>load()).catch(e=>setError(e.message));}}>Retry</button></OperatorState>}<p role="status" aria-live="polite">{notice}</p>
  {access&&<><div className="managed-records__toolbar"><label>Record type<select aria-label="Record type" value={kind} onChange={e=>setKind(e.target.value)}>{access.types.map(t=><option key={t.name} value={t.name}>{t.label}</option>)}</select></label><label>Search leads and custom records<input aria-label="Search leads and custom records" type="search" maxLength={500} value={query} onChange={e=>setQuery(e.target.value)}/></label>{access.canWrite&&<button type="button" className="operator-button" onClick={()=>{setRecord(undefined);setEditing(true);setError('');}}>New record</button>}</div>
   {editing&&type?<ManagedRecordForm key={kind+':'+(record?.ref.id??'new')} type={type} record={record} access={access} owners={owners} onSaved={saved} onCancel={()=>setEditing(false)}/>:record&&type?<section className="managed-records__detail"><h3>{String(record.fields.name??'Shared record')}</h3><dl>{Object.entries(type.fields).filter(([key])=>Object.hasOwn(record.fields,key)).map(([key,definition])=><div key={key}><dt>{definition.label}{definition.sensitivity==='private'?' · Private':''}</dt><dd>{record.fields[key]===null?'Not set':typeof record.fields[key]==='boolean'?record.fields[key]?'Yes':'No':String(record.fields[key])}</dd></div>)}</dl><div className="managed-records__actions"><button type="button" onClick={()=>setRecord(undefined)}>Back to list</button>{record.canEdit&&<button type="button" onClick={()=>setEditing(true)}>Edit record</button>}{record.canDelete&&<button type="button" onClick={()=>setConfirmDelete(true)}>Delete record</button>}</div>{confirmDelete&&<div className="managed-records__delete" role="group" aria-label="Confirm record deletion"><p>Delete this record and its saved shares permanently?</p><button type="button" disabled={busy} onClick={()=>void remove()}>Confirm delete</button><button type="button" disabled={busy} onClick={()=>setConfirmDelete(false)}>Keep record</button></div>}</section>:<>
    {!loaded&&!error?<OperatorState>Loading records…</OperatorState>:loaded&&!items.length?<p>No accessible records match.</p>:null}<ul className="managed-records__list">{items.map(item=><li key={item.ref.id}><button type="button" onClick={()=>void open(item.ref.id)}>{String(item.fields.name??'Shared record')}</button></li>)}</ul>{cursor&&<button type="button" disabled={busy} onClick={()=>void load(true)}>{busy?'Loading…':'Load more records'}</button>}
   </>}
  </>}
 </section>;
}
