import type {ImportInput,ImportKind} from '../contracts';
import {fields} from '../contracts';
import type {ConnectedSource} from '../source';
import {sha256} from '../../../../modules/import-kit/d1/index';
import {RecordError} from '../../records/shared';
import {sourceId,type Snapshot} from './provider';
export const exportStep='In Pipedrive open account menu > Tools and apps > Export data, select this entity with its source ID and field columns, then review the exported CSV in Orbit. Files and activity history need a separate export; they are not included in this pull.';
export interface PullMapping {stages:Record<string,string>;owners:Record<string,string|null>}
const kindFor={organizations:'company',persons:'contact',deals:'deal',notes:'note'} as const;
const scalarTypes=new Set(['varchar','text','double','date','time','enum']);
const fieldName=(field:Record<string,any>)=>`Pipedrive ${field.key}: ${cell(field.name).slice(0,140)}`;
const cell=(value:unknown)=>value===null||value===undefined?'':String(value);
const ref=(value:unknown)=>value===null||value===undefined?'':sourceId(value);
const primary=(values:any)=>Array.isArray(values)?cell((values.find(value=>value.primary)??values[0])?.value):cell(values);
const csv=(rows:unknown[][])=>rows.map(row=>row.map(value=>'"'+cell(value).replaceAll('"','""')+'"').join(',')).join('\r\n');
/** Turn the supported pull into the existing CSV planner, retaining source metadata and explicit omissions. */
export function pipedriveSource(snapshot:Snapshot,account:string,mapping:PullMapping){
 const diagnostics:ConnectedSource['diagnostics']=[],errors:Record<string,string>={},values:Record<string,Record<string,string>>={};
 const pointer=(kind:string,id:string,field?:string,definition=false)=>{
  const resource=definition?({company:'organizationFields',contact:'personFields',deal:'dealFields'} as Record<string,string>)[kind]:({company:'organizations',contact:'persons',deal:'deals',note:'notes'} as Record<string,string>)[kind];
  if(!resource)return undefined;const index=(snapshot[resource]??[]).findIndex(row=>sourceId(row.id)===id);if(index<0)return undefined;
  const row=snapshot[resource]![index]!,escape=(key:string)=>key.replaceAll('~','~0').replaceAll('/','~1');
  return `/${resource}/${index}`+(definition?'/key':field&&Object.hasOwn(row,field)?`/${escape(field)}`:field&&Object.hasOwn(row.custom_fields??{},field)?`/custom_fields/${escape(field)}`:'');
 };
 const warn=(code:string,message:string,kind:string,sourceId:string,field?:string,definition=false)=>{const location=pointer(kind,sourceId,field,definition);diagnostics.push({severity:'warning',code,message:`${message} ${exportStep}`,kind,sourceId,...field?{field}:{},location:{artifact:'pipedrive-source.json',...location?{pointer:location}:{}}});};
 const files:ImportInput['files']=[];
 for(const [resource,kind] of Object.entries(kindFor) as [keyof typeof kindFor,ImportKind][]){
  const metadata=snapshot[kind==='company'?'organizationFields':kind==='contact'?'personFields':'dealFields']??[];
  const custom=kind==='note'?[]:metadata.filter(field=>/^[a-f0-9]{40}$/i.test(field.key));
  const customNames=custom.filter(field=>scalarTypes.has(field.field_type)).map(field=>fieldName(field));
  for(const field of custom)if(!scalarTypes.has(field.field_type))warn('UNSUPPORTED_FIELD',`Field ${cell(field.name)} (${field.key}) has unsupported type ${cell(field.field_type)}.`,kind,sourceId(field.id),field.key,true);
  if(customNames.length>100)throw new RecordError(409,`This entity has more than 100 supported custom fields. ${exportStep}`);
  const headers=[...fields[kind],...customNames],rows:Record<string,string>[]=[];
  for(const record of snapshot[resource]??[]){
   const id=sourceId(record.id),row:Record<string,string>={id};
   if(record.is_deleted===true||record.deleted===true)errors[`${kind}:${id}`]='Deleted source records cannot be imported. Export the current record state.';
   if(kind==='company')Object.assign(row,{name:cell(record.name),owner:ref(record.owner_id)});
   if(kind==='contact'){
    const mail=primary(record.emails??record.email),phones=record.phones??record.phone;
    Object.assign(row,{name:cell(record.name),email:mail,phone:primary(phones),company_ids:ref(record.org_id),owner:ref(record.owner_id),permission:'',dnc:record.marketing_status==='subscribed'?'':'true'});
    // A provider label never establishes new sending permission. Missing source consent
    // also holds an existing identity, so an unavailable unsubscribe cannot be ignored.
    if(record.marketing_status===undefined)warn('UNSUPPORTED_FIELD','Marketing status was unavailable. This person, including an existing Orbit match, is held Do not contact until an explicit current-state clear.','contact',id,'marketing_status');
    if((record.emails??record.email)?.length>1)warn('ADDITIONAL_ADDRESSES','Only the primary email address is supported; additional addresses remain in source review.',kind,id,'emails');
   }
   if(kind==='deal'){
    const stage=ref(record.stage_id),pipeline=ref(record.pipeline_id),key=`${pipeline}:${stage}`;
    if(!(snapshot.pipelines??[]).some(item=>sourceId(item.id)===pipeline)||!(snapshot.stages??[]).some(item=>sourceId(item.id)===stage&&ref(item.pipeline_id)===pipeline))errors[`${kind}:${id}`]='The source pipeline and stage metadata do not match this deal. Export this deal and its pipeline metadata.';
    Object.assign(row,{title:cell(record.title),company_ids:ref(record.org_id),contact_ids:ref(record.person_id),stage:key,amount:cell(record.value),close_date:cell(record.expected_close_date),owner:ref(record.owner_id),status:cell(record.status)});
    values[`${kind}:${id}`]={status:cell(record.status)};
    if(record.currency!=='USD'){errors[`${kind}:${id}`]=`Unsupported currency ${cell(record.currency)} for Pipedrive deal ${id}. ${exportStep}`;warn('UNSUPPORTED_CURRENCY',`Deal ${id} uses ${cell(record.currency)}; no converted or zero-value deal will be created.`,kind,id,'currency');}
   }
   if(kind==='note')Object.assign(row,{text:cell(record.content),occurred_at:cell(record.add_time).replace(' ','T')+(record.add_time&&!/[zZ]|[+-]\d\d:\d\d$/.test(record.add_time)?'Z':''),company_ids:ref(record.org_id),contact_ids:ref(record.person_id),deal_ids:ref(record.deal_id),owner:ref(record.user_id)});
   for(const field of custom){if(!scalarTypes.has(field.field_type))continue;let value=record.custom_fields?.[field.key]??record[field.key];if(value&&typeof value==='object'&&Object.hasOwn(value,'value'))value=value.value;
    if(field.field_type==='enum'&&value!==null&&value!==undefined){const option=field.options?.find((option:any)=>String(option.id)===String(value));if(option)value=option.label;}
    if(value!==null&&value!==undefined&& !['string','number','boolean'].includes(typeof value)){warn('UNSUPPORTED_FIELD_VALUE',`Record ${id} has a non-scalar value in ${field.key}; the value was not imported.`,kind,id,field.key);continue;}
    if(typeof value==='number'&&!Number.isFinite(value)){warn('UNSUPPORTED_FIELD_VALUE',`Record ${id} has an invalid number in ${field.key}.`,kind,id,field.key);continue;}
    row[fieldName(field)]=cell(value);
   }
   const supported=new Set(['id','name','owner_id','org_id','person_id','title','pipeline_id','stage_id','value','currency','expected_close_date','status','content','add_time','user_id','emails','email','phones','phone','marketing_status','custom_fields','is_deleted','deleted']);
   for(const field of Object.keys(record))if(!supported.has(field)&&!custom.some(item=>item.key===field))warn('UNSUPPORTED_FIELD',`Record ${id}: field ${field} is retained only in source review.`,kind,id,field);
   for(const field of Object.keys(record.custom_fields??{}))if(!custom.some(item=>item.key===field))warn('UNSUPPORTED_FIELD',`Record ${id}: custom field ${field} has no available definition and was not imported.`,kind,id,field);
   rows.push(row);
  }
  files.push({kind,name:`pipedrive-${resource}.csv`,csv:csv([headers,...rows.map(row=>headers.map(header=>row[header]??''))]),mapping:Object.fromEntries(fields[kind].map(field=>[field,field])),customFields:customNames,separator:';'});
 }
 // Displayed regardless of source size: this is deliberately a supported subset, never a full migration claim.
 for(const entity of ['leads','products','activities','files','automations'])warn('HELD_ENTITY',`${entity} are outside this supported pull and have not been reconciled.`,entity,'account');
 warn('HELD_OWNER','Deal owner is retained as source history only; it is not assigned to an Orbit deal.','deal','account','owner_id');
 const raw=JSON.stringify(snapshot);if(Buffer.byteLength(raw)>2_000_000)throw new RecordError(409,`This pull exceeds the 2 MB review limit. ${exportStep}`);
 return{input:{vendor:'pipedrive',account:`company-${account}`,files,stages:mapping.stages,owners:mapping.owners,contactability:'mapped_permission'} as ImportInput,connected:{diagnostics,errors,values,artifacts:[{name:'pipedrive-source.json',sha256:sha256(raw),size:Buffer.byteLength(raw),original:{status:'available',base64:Buffer.from(raw).toString('base64')}}]} as ConnectedSource};
}
export function pullSummary(snapshot:Snapshot){return{counts:Object.fromEntries(Object.entries(snapshot).map(([kind,rows])=>[kind,rows.length])),pipelines:(snapshot.pipelines??[]).map(row=>({id:sourceId(row.id),name:cell(row.name)})),stages:(snapshot.stages??[]).map(row=>({id:sourceId(row.id),pipelineId:ref(row.pipeline_id),name:cell(row.name),key:`${ref(row.pipeline_id)}:${sourceId(row.id)}`})),owners:[...new Set(['organizations','persons'].flatMap(kind=>(snapshot[kind]??[]).map(row=>ref(row.owner_id)).filter(Boolean)))],associations:{peopleToOrganizations:(snapshot.persons??[]).filter(row=>row.org_id).length,dealsToOrganizations:(snapshot.deals??[]).filter(row=>row.org_id).length,dealsToPeople:(snapshot.deals??[]).filter(row=>row.person_id).length,noteLinks:(snapshot.notes??[]).reduce((sum,row)=>sum+['org_id','person_id','deal_id'].filter(key=>row[key]).length,0)}};}
