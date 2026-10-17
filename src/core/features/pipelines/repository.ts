import {createId} from '../../shared/ids';
import {audit,RecordError} from '../records/shared';
import type {PipelineInput,PipelineStageInput} from './contracts';
interface Pipeline {id:string;name:string;is_default:number;revision:number;created_at:string;updated_at:string}
export class PipelinesRepository {
 constructor(readonly db:D1Database){}
 async read(){
  const [pipelines,stages]=await Promise.all([
   this.db.prepare('SELECT * FROM pipelines ORDER BY is_default DESC,created_at,id').all<Pipeline>(),
   this.db.prepare('SELECT s.*,r.pipeline_id,r.probability,r.required_fields_json,r.stale_interval_days,p.name AS pipeline_name FROM pipeline_stages s JOIN pipeline_stage_rules r ON r.stage_id=s.id JOIN pipelines p ON p.id=r.pipeline_id ORDER BY s.position,s.id').all<{required_fields_json:string}&Record<string,unknown>>()
  ]);
  return {pipelines:pipelines.results,stages:stages.results.map(({required_fields_json,...stage})=>({...stage,required_fields:JSON.parse(required_fields_json)}))};
 }
 async require(id:string){const pipeline=await this.db.prepare('SELECT * FROM pipelines WHERE id=?').bind(id).first<Pipeline>();if(!pipeline)throw new RecordError(404,'Pipeline not found.');return pipeline;}
 private fence(pipeline:Pipeline){
  const guard=`pipeline_write_${createId()}`;
  return [this.db.prepare("INSERT INTO runtime_controls(name,value) SELECT ?,CASE WHEN EXISTS(SELECT 1 FROM pipelines WHERE id=? AND revision=? AND name=?) THEN 'valid' ELSE NULL END").bind(guard,pipeline.id,pipeline.revision,pipeline.name),this.db.prepare('DELETE FROM runtime_controls WHERE name=?').bind(guard)];
 }
 private async execute(statements:D1PreparedStatement[]){
  try{await this.db.batch(statements);}catch(error){
   const message=String(error);
   if(/PIPELINE_(?:STAGE_)?OCCUPIED|FOREIGN KEY constraint/.test(message))throw new RecordError(409,'Move opportunities before deleting their stage or pipeline.');
   if(/pipelines_name|pipelines\.name/.test(message))throw new RecordError(409,'A pipeline already uses that name.');
   if(/runtime_controls.value|UNIQUE constraint/.test(message))throw new RecordError(409,'The pipeline changed while you were editing. Reload its current stages.');
   throw error;
  }
 }
 private stageStatements(pipelineId:string,stage:PipelineStageInput,id:string,now:string){return [
  this.db.prepare(`INSERT INTO pipeline_stages(id,name,position,created_at,updated_at) VALUES(?,?,(SELECT COALESCE(MAX(position),-1)+1 FROM pipeline_stages),?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,position=excluded.position,updated_at=excluded.updated_at`).bind(id,stage.name,now,now),
  this.db.prepare(`INSERT INTO pipeline_stage_rules(stage_id,pipeline_id,probability,required_fields_json,stale_interval_days) VALUES(?,?,?,?,?) ON CONFLICT(stage_id) DO UPDATE SET pipeline_id=excluded.pipeline_id,probability=excluded.probability,required_fields_json=excluded.required_fields_json,stale_interval_days=excluded.stale_interval_days`).bind(id,pipelineId,stage.probability,JSON.stringify(stage.requiredFields),stage.staleIntervalDays)
 ];}
 async create(input:PipelineInput,actor:string){
  if(input.stages.some(stage=>stage.id))throw new RecordError(400,'New pipeline stages cannot reuse existing IDs.');
  const id=createId(),now=new Date().toISOString();
  await this.execute([
   this.db.prepare('INSERT INTO pipelines(id,name,is_default,created_at,updated_at) VALUES(?,?,0,?,?)').bind(id,input.name,now,now),
   ...input.stages.flatMap(stage=>this.stageStatements(id,stage,createId(),now)),audit(this.db,actor,'pipeline.created','pipeline',id,{name:input.name})
  ]);
  return {id};
 }
 async update(id:string,input:PipelineInput,actor:string){
  const pipeline=await this.require(id);
  if(input.revision!==undefined&&input.revision!==pipeline.revision)throw new RecordError(409,'The pipeline changed while you were editing. Reload its current stages.');
  const old=(await this.db.prepare('SELECT stage_id FROM pipeline_stage_rules WHERE pipeline_id=?').bind(id).all<{stage_id:string}>()).results.map(stage=>stage.stage_id);
  const given=input.stages.flatMap(stage=>stage.id?[stage.id]:[]);
  if(new Set(given).size!==given.length||given.some(stageId=>!old.includes(stageId)))throw new RecordError(400,'Use unique stage IDs from this pipeline.');
  const ids=input.stages.map(stage=>stage.id??createId()),now=new Date().toISOString();
  await this.execute([
   ...this.fence(pipeline),
   ...old.filter(stageId=>!ids.includes(stageId)).map(stageId=>this.db.prepare('DELETE FROM pipeline_stages WHERE id=?').bind(stageId)),
   ...input.stages.flatMap((stage,index)=>this.stageStatements(id,stage,ids[index],now)),
   this.db.prepare('UPDATE pipelines SET name=?,revision=revision+1,updated_at=? WHERE id=?').bind(input.name,now,id),
   audit(this.db,actor,'pipeline.updated','pipeline',id,{name:input.name})
  ]);
  return {id,revision:pipeline.revision+1};
 }
 async remove(id:string,actor:string){
  const pipeline=await this.require(id),replacement=await this.db.prepare('SELECT id FROM pipelines WHERE id<>? ORDER BY created_at,id LIMIT 1').bind(id).first<{id:string}>();
  if(!replacement)throw new RecordError(409,'Keep at least one pipeline.');
  const guard=`pipeline_write_${createId()}`;
  await this.execute([
   ...this.fence(pipeline),
   this.db.prepare("INSERT INTO runtime_controls(name,value) SELECT ?,CASE WHEN EXISTS(SELECT 1 FROM pipelines WHERE id=?) AND (SELECT count(*) FROM pipelines)>1 THEN 'valid' ELSE NULL END").bind(guard,replacement.id),
   this.db.prepare('DELETE FROM runtime_controls WHERE name=?').bind(guard),
   this.db.prepare('DELETE FROM pipeline_stages WHERE id IN(SELECT stage_id FROM pipeline_stage_rules WHERE pipeline_id=?)').bind(id),
   ...(pipeline.is_default?[this.db.prepare('UPDATE pipelines SET is_default=0 WHERE id=?').bind(id),this.db.prepare('UPDATE pipelines SET is_default=1,revision=revision+1 WHERE id=?').bind(replacement.id)]:[]),
   this.db.prepare('DELETE FROM pipelines WHERE id=?').bind(id),audit(this.db,actor,'pipeline.deleted','pipeline',id,{name:pipeline.name})
  ]);
  return {deleted:true};
 }
 /** The old settings API edits only the current default pipeline, preserving rules. */
 async legacyStages(stages:{id?:string;name:string}[],actor:string){
  if(!stages.length||new Set(stages.flatMap(stage=>stage.id?[stage.id]:[])).size!==stages.filter(stage=>stage.id).length)throw new RecordError(400,'Keep at least one stage and use unique IDs.');
  const pipeline=await this.db.prepare('SELECT * FROM pipelines WHERE is_default=1').first<Pipeline>();
  if(!pipeline)throw new RecordError(409,'The default pipeline is unavailable.');
  const current=(await this.db.prepare('SELECT stage_id,probability,required_fields_json,stale_interval_days FROM pipeline_stage_rules WHERE pipeline_id=?').bind(pipeline.id).all<{stage_id:string;probability:number;required_fields_json:string;stale_interval_days:number|null}>()).results;
  await this.update(pipeline.id,{name:pipeline.name,revision:pipeline.revision,stages:stages.map(stage=>{const rule=current.find(item=>item.stage_id===stage.id);return {...stage,probability:rule?.probability??0,requiredFields:JSON.parse(rule?.required_fields_json??'[]'),staleIntervalDays:rule?.stale_interval_days??null};})},actor);
  const saved=(await this.db.prepare('SELECT s.id,s.name FROM pipeline_stages s JOIN pipeline_stage_rules r ON r.stage_id=s.id WHERE r.pipeline_id=? ORDER BY s.position').bind(pipeline.id).all()).results;
  return {stages:saved};
 }
}
