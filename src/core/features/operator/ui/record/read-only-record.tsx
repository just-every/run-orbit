import {useCallback} from 'react';
import {Link,useParams} from '@tanstack/react-router';
import {DataValue,fieldLabel,storedValue} from '../data-value';
import {formatCurrency,formatDay} from '../formatters';
import {operatorApi} from '../operator-api';
import {OperatorShell,OperatorState} from '../operator-shell';
import {recordsRequest,type RecordKind} from '../records-api';
import {useOperatorResource} from '../use-operator-resource';
import {DealActivity} from './deal-activity';
import {DealOutcome} from './deal-outcome';
import {DetailsGroup,DetailsPanel} from './details-panel';
import {NextAction} from './next-action';
import {readRecord} from './record-api';
import {RecordActivity} from './record-activity';
import {RecordFrame} from './record-page';
import {dealInNow,RecordNextAction} from './record-next-action';
import {RecordedDetails} from './recorded-details';
import {useRefresh} from './use-refresh';

/** The existing record frame with readable values and activity; authoring components never mount. */
export function ReadOnlyRecord({kind}:{kind:RecordKind}){
 const {id}=useParams({strict:false}) as {id:string};
 const load=useCallback(async()=>{
  const [detail,settings,deal]=await Promise.all([readRecord<any>(kind,id),recordsRequest<any>('settings'),kind==='opportunity'?operatorApi.readOpportunity(id):Promise.resolve(null)]);
  return {detail,settings,opportunity:deal?.opportunity};
 },[kind,id]);
 const resource=useOperatorResource(`read-only:${kind}:${id}`,load),data=resource.data,reload=resource.reload;
 useRefresh(reload);
 if(!data)return <OperatorShell title={kind==='opportunity'?'Opportunity':kind==='contact'?'Contact':'Company'}>{resource.error?<OperatorState kind="error">{resource.error.message}</OperatorState>:<OperatorState>Loading record…</OperatorState>}</OperatorShell>;
 const {detail,settings,opportunity}=data,row=detail.record,name=row.title??row.name??row.email,workspace=settings.workspace;
 const company=detail.company?<Link className="r-eyebrow-link" to="/app/companies/$id" params={{id:detail.company.id}}>{detail.company.name}</Link>:kind==='opportunity'?'Opportunity':kind==='contact'?'Contact':'Company';
 const fields=kind==='opportunity'?{Stage:settings.stages.find((stage:any)=>stage.id===row.stage_id)?.name,Value:formatCurrency(row.value_cents,workspace),Owner:settings.operators.find((person:any)=>person.id===row.owner_id)?.display_name,'Expected close':row.expected_close_at?formatDay(row.expected_close_at):null}:Object.fromEntries((kind==='contact'?['email','phone','job_title','timezone','contactability']:['primary_domain']).map(field=>[fieldLabel(field),row[field]]));
 // A won or lost deal reads as the full operator's does: its dated outcome and reason in the header, and no next action.
 const closed=opportunity?.lifecycle==='won'||opportunity?.lifecycle==='lost';
 return <OperatorShell title={name} eyebrow={company} heading={closed?<><h1>{name}</h1><DealOutcome record={row}/></>:undefined}>
  <RecordFrame
   next={opportunity?(closed?null:<NextAction opportunity={opportunity} presentation={workspace} aiConfigured={false} reload={reload} composing={false} onCompose={()=>{}} readOnly/>):<RecordNextAction name={name} deal={dealInNow(detail.opportunities)} workspace={workspace} writing={false} newDeal={{}} readOnly/>}
   activity={opportunity?<DealActivity opportunity={opportunity} drafts={[]} messages={null} handoffs={[]} reload={reload} readOnly/>:<RecordActivity kind={kind as 'contact'|'company'} id={id} record={row} timeline={detail.timeline} contacts={detail.contacts} reloadMail={async()=>{}} reload={reload} readOnly/>}
   folds={opportunity?<RecordedDetails opportunity={opportunity} presentation={workspace} reload={reload} readOnly/>:null}
   details={<DetailsPanel><DetailsGroup label={kind==='opportunity'?'Deal':'Record'}>{Object.entries(fields).map(([label,value])=><p key={label}><strong>{label}:</strong> <DataValue value={value}/></p>)}{Object.entries(storedValue('custom_fields_json',row.custom_fields_json) as Record<string,unknown>??{}).map(([field,value])=><p key={field}><strong>{fieldLabel(field)}:</strong> <DataValue value={value}/></p>)}</DetailsGroup></DetailsPanel>}
  />
 </OperatorShell>;
}
