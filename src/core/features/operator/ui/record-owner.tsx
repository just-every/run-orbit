import {useState} from 'react';
import {recordsRequest,type CustomerRecord,type RecordKind} from './records-api';
import {OwnerOptions,type RecordOperator} from './record-ownership-api';

export function RecordOwner({kind,record,operators,onChanged}:{kind:RecordKind;record:CustomerRecord;operators:RecordOperator[];onChanged:()=>Promise<void>}){
 const [owner,setOwner]=useState<string>(record.owner_id??''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function save(){setBusy(true);setError('');try{await recordsRequest(`records/owners/${kind}/${record.id}`,'PUT',{ownerId:owner||null});await onChanged();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <section className="record-owner" aria-label="Record ownership"><h3>Owner</h3><p>{record.owner_name??'Unassigned'}</p><div className="record-owner__controls"><label>Assign owner<select value={owner} onChange={e=>setOwner(e.target.value)} disabled={busy}><option value="">Unassigned</option><OwnerOptions operators={operators}/></select></label><button type="button" disabled={busy||owner===(record.owner_id??'')} onClick={()=>void save()}>{busy?'Saving owner…':'Save owner'}</button></div>{error&&<p role="alert">{error}</p>}<p className="record-owner__hint">Changes appear in this record’s timeline. Related records keep their own owners.</p></section>;
}

// Disabled until the page applies its My contacts/companies default, so an early choice is never overwritten.
export function RecordOwnerFilter({kind,value,operators,disabled,onChange}:{kind:RecordKind;value:string;operators:RecordOperator[];disabled:boolean;onChange:(value:string)=>void}){
 return <label>Owner<select aria-label="Owner" value={value} disabled={disabled} onChange={e=>onChange(e.target.value)}><option value="">All owners</option><option value="me">My {kind==='company'?'companies':kind==='contact'?'contacts':'opportunities'}</option><option value="unassigned">Unassigned</option><OwnerOptions operators={operators}/></select></label>;
}
