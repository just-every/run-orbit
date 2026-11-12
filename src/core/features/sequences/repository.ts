import {createId} from '../../shared/ids';
import {isFullOperator} from '../access/identity-class';
import {LibraryRepository,validateFields} from '../drafts/library-repository';
import {WorkbenchError} from '../workbench/repository';
import {previewSchedule} from './calendar';
import type {Sequence,SequenceCalendar,SequenceContent,SequenceHistory,Step} from './schema';

type SequenceRow={id:string;owner_id:string;visibility:Sequence['visibility'];version:number;source_id:string|null;source_version:number|null;history_json:string};
const selection=`SELECT s.*,(SELECT json_group_array(json(v.item)) FROM (
 SELECT json_object('version',version,'name',name,'steps',json(steps_json),'calendar',json(calendar_json),
 'createdAt',created_at,'createdBy',created_by,'authorName',(SELECT display_name FROM operators WHERE id=created_by)) AS item
 FROM sequence_versions WHERE sequence_id=s.id ORDER BY version DESC
) v) AS history_json FROM sequences s`;

export class SequenceRepository {
 constructor(readonly db:D1Database){}

 async access(actor:string){
  if(!await isFullOperator(this.db,actor))throw new WorkbenchError(403,'Sequence authoring requires a full operator.');
 }

 private permissionFence(actor:string){
  return this.db.prepare(`INSERT INTO runtime_controls(name,value) SELECT 'sequence_permission_changed',NULL
   WHERE NOT EXISTS(SELECT 1 FROM operators o WHERE o.id=? AND o.status='active'
   AND NOT EXISTS(SELECT 1 FROM access_collaborators c WHERE c.operator_id=o.id))`).bind(actor);
 }

 private currentFence(sequence:Sequence,actor:string,owner=false){
  return this.db.prepare(`INSERT INTO runtime_controls(name,value) SELECT 'sequence_version_changed',NULL
   WHERE NOT EXISTS(SELECT 1 FROM sequences WHERE id=? AND version=? AND visibility=?
   AND owner_id=? AND ${owner?'owner_id=?':"(owner_id=? OR visibility='workspace')"})`)
   .bind(sequence.id,sequence.version,sequence.visibility,sequence.ownerId,actor);
 }

 private fromRow(row:SequenceRow):Sequence{
  const history=JSON.parse(row.history_json) as SequenceHistory[],current=history.find(v=>v.version===row.version);
  if(!current)throw new Error('Sequence content version is missing.');
  return{id:row.id,ownerId:row.owner_id,visibility:row.visibility,version:row.version,name:current.name,
   steps:current.steps,calendar:current.calendar,source:row.source_id?{id:row.source_id,version:row.source_version!}:null,history};
 }

 async list(actor:string){
  await this.access(actor);
  const rows=await this.db.prepare(`${selection} WHERE s.owner_id=? OR s.visibility='workspace' ORDER BY s.created_at DESC,s.id`).bind(actor).all<SequenceRow>();
  return{actorId:actor,sequences:rows.results.map(row=>this.fromRow(row))};
 }

 async read(id:string,actor:string){
  await this.access(actor);
  const row=await this.db.prepare(`${selection} WHERE s.id=? AND (s.owner_id=? OR s.visibility='workspace')`).bind(id,actor).first<SequenceRow>();
  if(!row)throw new WorkbenchError(404,'Sequence is unavailable.');
  return this.fromRow(row);
 }

 private async calendar(){
  const row=await this.db.prepare("SELECT timezone,working_hours_json FROM workspace_settings WHERE id='workspace'").first<{timezone:string;working_hours_json:string}>();
  if(!row)throw new WorkbenchError(400,'Configure workspace working days and timezone first.');
  const working=JSON.parse(row.working_hours_json) as {days?:unknown};
  if(!Array.isArray(working.days)||!working.days.length||!working.days.every(day=>Number.isInteger(day)&&day>=0&&day<=6))throw new WorkbenchError(400,'Configure valid workspace working days first.');
  try{new Intl.DateTimeFormat('en-US',{timeZone:row.timezone});}catch{throw new WorkbenchError(400,'Configure a valid workspace timezone first.');}
  const calendar:SequenceCalendar={timezone:row.timezone,days:[...new Set(working.days as number[])].sort((a,b)=>a-b)};
  const fence=this.db.prepare(`INSERT INTO runtime_controls(name,value) SELECT 'sequence_calendar_changed',NULL
   WHERE NOT EXISTS(SELECT 1 FROM workspace_settings WHERE id='workspace' AND timezone=? AND working_hours_json=?)`).bind(row.timezone,row.working_hours_json);
  return{calendar,fence};
 }

 private async libraryFences(steps:Step[],actor:string,workspace=false){
  const library=new LibraryRepository(this.db),fences:D1PreparedStatement[]=[];
  for(const step of steps){
   if(step.kind!=='email')continue;
   if(!('library' in step)){validateFields(step.subject+'\n'+step.body);continue;}
   const entry=await library.read(step.library.id,actor);
   if(entry.kind!=='template')throw new WorkbenchError(400,'An email step must reference a library template.');
   if(entry.revision!==step.library.revision)throw new WorkbenchError(409,'The library template changed. Select its current revision.');
   if(workspace&&entry.visibility!=='shared')throw new WorkbenchError(403,'Workspace sequences require shared library templates.');
   fences.push(this.db.prepare(`INSERT INTO runtime_controls(name,value) SELECT 'sequence_library_changed',NULL
    WHERE NOT EXISTS(SELECT 1 FROM message_library WHERE id=? AND revision=? AND kind='template'
    AND (owner_id=? OR visibility='shared') AND (?=0 OR visibility='shared'))`)
    .bind(entry.id,entry.revision,actor,Number(workspace)));
  }
  return fences;
 }

 private versionInsert(id:string,version:number,content:SequenceContent,calendar:SequenceCalendar,actor:string){
  return this.db.prepare(`INSERT INTO sequence_versions(sequence_id,version,name,steps_json,calendar_json,created_at,created_by)
   SELECT ?,?,?,?,?,?,id FROM operators WHERE id=?`)
   .bind(id,version,content.name,JSON.stringify(content.steps),JSON.stringify(calendar),new Date().toISOString(),actor);
 }

 private async batch(statements:D1PreparedStatement[]){
  try{await this.db.batch(statements);}catch(error){
   if(/runtime_controls\.value|sequence_versions\.sequence_id, sequence_versions\.version/.test(String(error)))throw new WorkbenchError(409,'Sequence, permissions, library content or working days changed. Reload before saving.');
   throw error;
  }
 }

 async create(actor:string,content:SequenceContent){
  await this.access(actor);
  const [{calendar,fence},references]=await Promise.all([this.calendar(),this.libraryFences(content.steps,actor)]),id=createId();
  await this.batch([this.permissionFence(actor),fence,...references,
   this.db.prepare("INSERT INTO sequences(id,owner_id,visibility,version,created_at) VALUES(?,?,'private',1,?)").bind(id,actor,new Date().toISOString()),
   this.versionInsert(id,1,content,calendar,actor)]);
  return this.read(id,actor);
 }

 private async editable(id:string,actor:string,version:number){
  const sequence=await this.read(id,actor);
  if(sequence.ownerId!==actor)throw new WorkbenchError(403,'Only the sequence owner can edit or share it. Copy it to make your own changes.');
  if(sequence.version!==version)throw new WorkbenchError(409,'The sequence changed. Reload its current version.');
  return sequence;
 }

 async edit(id:string,actor:string,input:SequenceContent&{version:number}){
  const sequence=await this.editable(id,actor,input.version);
  const [{calendar,fence},references]=await Promise.all([this.calendar(),this.libraryFences(input.steps,actor,sequence.visibility==='workspace')]);
  await this.batch([this.permissionFence(actor),this.currentFence(sequence,actor,true),fence,...references,
   this.versionInsert(id,input.version+1,input,calendar,actor),
   this.db.prepare('UPDATE sequences SET version=version+1 WHERE id=? AND version=? AND owner_id=?').bind(id,input.version,actor)]);
  return this.read(id,actor);
 }

 async share(id:string,actor:string,input:{version:number;visibility:Sequence['visibility']}){
  const sequence=await this.editable(id,actor,input.version);
  const references=input.visibility==='workspace'?await this.libraryFences(sequence.steps,actor,true):[];
  await this.batch([this.permissionFence(actor),this.currentFence(sequence,actor,true),...references,
   this.versionInsert(id,input.version+1,sequence,sequence.calendar,actor),
   this.db.prepare('UPDATE sequences SET visibility=?,version=version+1 WHERE id=? AND version=? AND owner_id=?').bind(input.visibility,id,input.version,actor)]);
  return this.read(id,actor);
 }

 async copy(id:string,actor:string,input:{version:number;name:string}){
  const sequence=await this.read(id,actor);
  if(sequence.version!==input.version)throw new WorkbenchError(409,'The source sequence changed. Reload its current version.');
  const references=await this.libraryFences(sequence.steps,actor),copyId=createId();
  await this.batch([this.permissionFence(actor),this.currentFence(sequence,actor),...references,
   this.db.prepare("INSERT INTO sequences(id,owner_id,visibility,version,source_id,source_version,created_at) VALUES(?,?,'private',1,?,?,?)").bind(copyId,actor,id,input.version,new Date().toISOString()),
   this.versionInsert(copyId,1,{name:input.name,steps:sequence.steps},sequence.calendar,actor)]);
  return this.read(copyId,actor);
 }

 async preview(id:string,actor:string,startAt:string){
  const sequence=await this.read(id,actor);
  return previewSchedule(sequence.steps,sequence.calendar,startAt);
 }
}
