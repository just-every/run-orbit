import {RecordsRepository} from '../records/repository';
import {CaptureError} from '../capture/contracts';
import {mappedValue,setMapped} from './mappings';
import {recordSnapshotFence} from './field-intake';
/** Only explicitly form-derived proposals can use these additional mapped fields. */
export async function reviewedFormField(db:D1Database,proposal:{record_type:string;record_id:string;field:string|null;current_value:string|null;proposed_value:string|null},details:Record<string,any>,actor:string,edit?:string){
 const kind=proposal.record_type,field=proposal.field;
 if((kind!=='contact'&&kind!=='company')||!field||field==='email'||field==='primary_domain')throw new CaptureError(400,'This identity property cannot be changed from a form proposal.');
 const raw=edit??proposal.proposed_value??'';let value:unknown;
 try{value=mappedValue({recordType:kind,field,valueType:details.valueType},raw);}catch(error){throw new CaptureError(400,error instanceof Error?error.message:'Invalid mapped value.');}
 if(value===null)throw new CaptureError(400,'Enter a non-empty proposed value.');
 const table=kind==='contact'?'contacts':'companies',record=await db.prepare(`SELECT * FROM ${table} WHERE id=?`).bind(proposal.record_id).first<Record<string,any>>();
 if(!record)throw new CaptureError(409,'This record is no longer available.');
 const custom=JSON.parse(record.custom_fields_json??'{}'),current=field.startsWith('custom.')?custom[field.slice(7)]:record[field],serialized=current===null||current===undefined?null:typeof current==='string'?current:JSON.stringify(current);
 if(serialized!==proposal.current_value)throw new CaptureError(409,'The property changed since this proposal was prepared.');
 const values={...record,custom_fields:custom};setMapped(values,field,value);
 const saved=await new RecordsRepository(db).prepareSave(kind,values,actor,proposal.record_id,{ordinaryEdit:true});
 return {value:typeof value==='string'?value:JSON.stringify(value),statements:[recordSnapshotFence(db,kind,record),...saved.statements]};
}
