import {WorkspaceArchiveTools} from './WorkspaceArchiveTools';
import {DuplicateReview} from './duplicate-review';
import type {RecordKind} from './records-api';

export function RecordsDataTools({kind,onChanged}:{kind:RecordKind;onChanged:()=>void}){
 const fields=kind==='contact'?['name','email','phone','job_title','timezone','company_id','contactability','custom_fields_json']:['name','primary_domain','custom_fields_json'];
 return <details className="operator-surface workbench-form"><summary>Import, duplicate review and data export</summary>
  <a href="/app/imports">Move in customer records with a reviewed CSV import</a>
  {kind!=='opportunity'&&<DuplicateReview kind={kind} fields={fields} onChanged={onChanged}/>}
  <WorkspaceArchiveTools/>
 </details>;
}
