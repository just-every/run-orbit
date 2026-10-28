import {useEffect,useState} from 'react';
import {recordsRequest} from '../operator/ui/records-api';
import {OperatorState} from '../operator/ui/operator-shell';
import type {DefinitionsResponse} from './contracts';
import {ManagedTypeForm} from './type-form';
import './styles.css';

/** Configuration belongs in Settings; everyday record work lives in Records. */
export function ManagedRecordSettings(){
 const [data,setData]=useState<DefinitionsResponse>(),[selected,setSelected]=useState('new'),[error,setError]=useState(''),[notice,setNotice]=useState('');
 async function load(){const result=await recordsRequest<DefinitionsResponse>('managed-records/definitions');setData(result);setError('');}
 useEffect(()=>{void load().catch(e=>setError(e.message));},[]);
 if(data&&!data.canManageTypes)return null;
 return <section className="operator-surface workbench-form managed-record-settings" aria-label="Object types"><h2>Object types</h2><p>Configure lead fields and the custom objects your team works with in Records.</p>{error&&<OperatorState kind="error">{error}<button type="button" onClick={()=>void load().catch(e=>setError(e.message))}>Retry</button></OperatorState>}<p role="status" aria-live="polite">{notice}</p>
  {!data&&!error&&<OperatorState>Loading object types…</OperatorState>}{data&&<><label>Configure object type<select aria-label="Configure object type" value={selected} onChange={e=>{setSelected(e.target.value);setNotice('');}}><option value="new">New object type</option>{data.types.map(type=><option key={type.name} value={type.name}>{type.label}</option>)}</select></label><ManagedTypeForm key={selected+':'+(data.types.find(type=>type.name===selected)?.version??0)} type={data.types.find(type=>type.name===selected)} onSaved={async name=>{await load();setSelected(name);setNotice('Object type saved');}}/></>}
 </section>;
}
