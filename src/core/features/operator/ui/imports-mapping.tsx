import { parseCsv } from '../../../shared/csv';
import { customFieldKinds,fields,type ImportFile,type ImportInput,type ImportKind } from '../../imports/contracts';
const fieldLabels:Record<string,string>={
 id:'ID in your old system',name:'Full name',first_name:'First name',last_name:'Last name',email:'Email',phone:'Phone',
 job_title:'Job title',company_ids:'Company ID (from the companies file)',company_name:'Company name',owner:'Owner in your file',
 dnc:'Do not contact',bounce:'Email bounce',quarantined:'Email quarantined',permission:'Permission to contact',
 domain:'Company website domain',description:'Description',title:'Deal title',contact_ids:'Contact IDs (from the contacts file)',stage:'Pipeline stage',
 amount:'Deal value',close_date:'Expected close date',text:'Note text',occurred_at:'Activity date and time',
 deal_ids:'Deal IDs (from the deals file)',reason:'Reason',
};
const kindNames:Record<ImportKind,string>={contact:'Contacts',company:'Companies',deal:'Deals',note:'Notes',suppression:'Do not contact list'};
const linkFields=['company_ids','contact_ids','deal_ids'];
const label=(kind:ImportKind,field:string)=>field==='name'&&kind==='company'?'Company name':fieldLabels[field];
const headersOf=(file:ImportFile)=>parseCsv(file.csv.replace(/^﻿/,''))[0]??[];

/** A generic spreadsheet keeps every column it does not map, as a custom field named after the column. */
export function defaultCustomFields(vendor:ImportInput['vendor'],kind:ImportKind,headers:string[],mapping:Record<string,string>){
 return vendor==='csv'&&customFieldKinds.has(kind)?headers.filter(header=>header.trim()&&!Object.values(mapping).includes(header)):[];
}

export function ImportMappingFields({files,setFiles,stages,setStages,nativeStages}:{files:ImportInput['files'];setFiles:(files:ImportInput['files'])=>void;stages:Record<string,string>;setStages:(stages:Record<string,string>)=>void;nativeStages:any[]}){
 const deals=files.find(f=>f.kind==='deal'),dealRows=deals?parseCsv(deals.csv.replace(/^﻿/,'')):[],stageColumn=deals?.mapping.stage?dealRows[0]?.indexOf(deals.mapping.stage):-1,sourceStages=stageColumn!==undefined&&stageColumn>=0?[...new Set(dealRows.slice(1).map(row=>row[stageColumn]))]:[];
 const update=(file:ImportFile,next:Partial<ImportFile>)=>setFiles(files.map(f=>f===file?{...f,...next}:f));
 function map(file:ImportFile,field:string,header:string){
  const mapping=Object.fromEntries(Object.entries({...file.mapping,[field]:header}).filter(([,v])=>v));
  update(file,{mapping,customFields:(file.customFields??[]).filter(h=>!Object.values(mapping).includes(h))});
 }
 return <>{files.map(file=>{
  const headers=headersOf(file),others=headers.filter(header=>header.trim()&&!Object.values(file.mapping).includes(header)),custom=file.customFields??[];
  return <details open className="crm-mapping" key={file.kind}><summary>{kindNames[file.kind]}: {file.name}</summary>
   <p>Choose the column in your file that holds each detail. Leave a detail as “Not in this file” when your file has no such column.</p>
   <div className="crm-field-grid">{fields[file.kind].map(field=><label key={field}>{label(file.kind,field)}<select aria-label={label(file.kind,field)} value={file.mapping[field]??''} onChange={e=>map(file,field,e.target.value)}><option value="">Not in this file</option>{headers.map(header=><option key={header}>{header}</option>)}</select></label>)}
    {linkFields.some(field=>file.mapping[field])?<label>Several IDs in one cell are separated by<select aria-label="Several IDs in one cell are separated by" value={file.separator} onChange={e=>update(file,{separator:e.target.value as ';'|','|'|'})}>{([[';','Semicolon ( ; )'],[',','Comma ( , )'],['|','Bar ( | )']] as const).map(([v,name])=><option key={v} value={v}>{name}</option>)}</select></label>:null}
   </div>
   {others.length?<fieldset className="crm-other-columns"><legend>Other columns in this file</legend>
    <p>{customFieldKinds.has(file.kind)?'Each of these can come in as a custom field with the same name, shown on every record. Anything you leave out stays only in Orbit’s private copy of your file.':'Orbit does not import these. They stay only in Orbit’s private copy of your file.'}</p>
    {customFieldKinds.has(file.kind)?<div className="crm-field-grid">{others.map(header=><label key={header}>{header}<select aria-label={`Column ${header}`} value={custom.includes(header)?'custom':''} onChange={e=>update(file,{customFields:e.target.value?[...custom,header]:custom.filter(h=>h!==header)})}><option value="custom">Add as custom field “{header}”</option><option value="">Leave out</option></select></label>)}</div>:<p>{others.join(', ')}</p>}
   </fieldset>:null}
  </details>;
 })}{sourceStages.length?<fieldset><legend>Destination stages</legend><p>Choose the Orbit stage for each stage in your deals file.</p>{sourceStages.map(stage=><label key={stage}>{stage||'(empty stage)'}<select aria-label={stage||'(empty stage)'} required value={stages[stage]??''} onChange={e=>setStages({...stages,[stage]:e.target.value})}><option value="">Choose an Orbit stage</option>{nativeStages.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>)}</fieldset>:null}</>;
}
