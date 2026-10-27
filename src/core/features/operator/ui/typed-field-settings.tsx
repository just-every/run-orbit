import {TypedFieldHistory} from './typed-field-history';
import {FieldOutcome,refusal,type Outcome} from './typed-field-outcome';
import {useEffect,useRef,useState} from 'react';
import {recordsRequest} from './records-api';
import {plainFailure} from '../../dashboards/save-failure';
import {OperatorState} from './operator-shell';
import './typed-field-settings.css';
const blank={fieldKey:'',label:'',valueType:'text',required:false,unique:false,options:[] as string[],archived:false};
type Review={input:typeof blank&{kind:string};reviewHash:string;affected:{id:string;name:string;reason:string}[];duplicateCount:number;recordCount:number;stale?:boolean};
export function TypedFieldSettings(){
 const name=useRef<HTMLInputElement>(null),reviewed=useRef<HTMLElement>(null),chosen=useRef(false);
 const [kind,setKind]=useState('contact'),[fields,setFields]=useState<any[]>([]),[editable,setEditable]=useState(false),[listFailure,setListFailure]=useState(''),[value,setValue]=useState(blank),[review,setReview]=useState<Review>(),[busy,setBusy]=useState(false),[outcome,setOutcome]=useState<Outcome>(),[open,setOpen]=useState(false),[named,setNamed]=useState(0);
 // An empty list opens the create form; its first field takes focus only when the owner chose this record type, never on page load.
 async function load(){setListFailure('');try{const result=await recordsRequest<any>('settings/custom-fields?kind='+kind);setFields(result.fields);setEditable(result.editable);if(result.editable&&!result.fields.length){setOpen(true);if(chosen.current)setNamed(n=>n+1);}}catch(e){setListFailure(plainFailure(e));}}
 useEffect(()=>{setReview(undefined);setOutcome(undefined);setValue(blank);void load();},[kind]);
 useEffect(()=>{if(named)name.current?.focus();},[named]);
 // A preview's refusal shows under the control that asked for it; a fresh preview after a refused Apply keeps the old review until the new one arrives.
 async function preview(input:typeof blank,at:'editor'|'review'){
  if(busy)return;setBusy(true);setOutcome(undefined);
  try{setReview(await recordsRequest<Review>('settings/custom-fields/preview','POST',{kind,...input}));if(at==='review')reviewed.current?.focus();}
  catch(e){if(at==='editor')setReview(undefined);setOutcome(refusal(at,e,()=>void preview(input,at),()=>void preview(input,at)));}
  finally{setBusy(false);}
 }
 async function apply(current:Review){
  if(busy)return;setBusy(true);setOutcome(undefined);
  try{await recordsRequest('settings/custom-fields/confirm','POST',{input:current.input,reviewHash:current.reviewHash,confirmed:true});setReview(undefined);setValue(blank);setOpen(false);setOutcome({at:'saved',text:'Saved',failed:false});await load();}
  catch(e){if((e as {status?:number}).status===409)setReview({...current,stale:true});setOutcome(refusal('review',e,()=>void apply(current),()=>void preview(current.input,'review')));}
  finally{setBusy(false);}
 }
 return <section className="operator-surface workbench-form" aria-labelledby="typed-fields"><h2 id="typed-fields">Custom field definitions</h2>
  <label>Record type<select aria-label="Field record type" value={kind} onChange={e=>{chosen.current=true;setKind(e.target.value);}}><option value="contact">Contacts</option><option value="company">Companies</option><option value="opportunity">Deals</option></select></label>
  {listFailure?<OperatorState kind="error">{listFailure} <button type="button" onClick={()=>void load()}>Retry</button></OperatorState>:<ul>{fields.map(f=><li key={f.field_key}>{f.label} · {f.value_type}{f.required?' · required':''}{f.is_unique?' · unique':''}{f.archived?' · archived':editable&&<button type="button" onClick={()=>{setValue({fieldKey:f.field_key,label:f.label,valueType:f.value_type,required:!!f.required,unique:!!f.is_unique,options:JSON.parse(f.options_json),archived:false});setReview(undefined);setOutcome(undefined);setOpen(true);setNamed(n=>n+1);}}>Change {f.label}</button>}<TypedFieldHistory key={kind+f.field_key+f.revision} kind={kind} fieldKey={f.field_key} label={f.label}/></li>)}</ul>}
  {editable&&<details open={open} onToggle={e=>setOpen(e.currentTarget.open)}><summary>Define or change a field</summary><form className="workbench-form" onSubmit={e=>{e.preventDefault();void preview(value,'editor');}} onChange={()=>{setReview(undefined);setOutcome(undefined);}}><label>Field key<input aria-label="Field key" required pattern="[a-z][a-z0-9_]{0,63}" value={value.fieldKey} onChange={e=>setValue({...value,fieldKey:e.target.value})}/></label><label>Field name<input ref={name} aria-label="Field name" required value={value.label} onChange={e=>setValue({...value,label:e.target.value})}/></label><label>Field type<select aria-label="Field type" value={value.valueType} onChange={e=>setValue({...value,valueType:e.target.value})}><option value="text">Text</option><option value="number">Number</option><option value="date">Date</option><option value="picklist">Picklist</option></select></label>{value.valueType==='picklist'&&<label>Picklist options<textarea aria-label="Picklist options" required value={value.options.join('\n')} onChange={e=>setValue({...value,options:e.target.value.split('\n')})}/></label>}<label><input type="checkbox" checked={value.required} onChange={e=>setValue({...value,required:e.target.checked})}/>Required</label><label><input type="checkbox" checked={value.unique} onChange={e=>setValue({...value,unique:e.target.checked})}/>Unique</label><label><input type="checkbox" checked={value.archived} onChange={e=>setValue({...value,archived:e.target.checked})}/>Archive field</label><button className="operator-button" aria-disabled={busy||undefined}>Preview affected records</button>{outcome?.at==='editor'&&<FieldOutcome outcome={outcome}/>}</form></details>}
  {review&&<section ref={reviewed} tabIndex={-1} aria-label="Affected field records"><h3>Review affected records</h3><p>{review.affected.length} affected of {review.recordCount} records. Existing values stay unchanged.</p><ul>{review.affected.map((r,index)=><li key={r.id+index}>{r.name}: {r.reason}</li>)}</ul>
   <div className="typed-field-actions"><button className="operator-button" type="button" disabled={review.stale||review.duplicateCount>0} aria-disabled={busy||undefined} onClick={()=>void apply(review)}>Apply reviewed definition</button><button type="button" onClick={()=>{setReview(undefined);setOutcome(undefined);}}>Cancel field change</button></div>
   {outcome?.at==='review'&&<FieldOutcome outcome={outcome}/>}
  </section>}
  {outcome?.at==='saved'&&<FieldOutcome outcome={outcome}/>}
 </section>;
}
