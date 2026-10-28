/** Called by the native archive restore after its source tables are present.
 * Historic archives have no managed types; seed only the missing native lead.
 * Existing graph privacy is retained when rebuilding the read projection. */
export function restoreManagedRecordStatements(db:D1Database):D1PreparedStatement[]{
 const fields={name:{label:'Record name',type:'text',required:true,sensitivity:'public'},email:{label:'Email',type:'text',required:false,sensitivity:'public'},phone:{label:'Phone',type:'text',required:false,sensitivity:'public'},description:{label:'Description',type:'text',required:false,sensitivity:'public'}};
 return[
  db.prepare("INSERT OR IGNORE INTO managed_record_types(name,label,fields_json,version,created_at,updated_at) VALUES('lead','Leads',?,1,strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now'))").bind(JSON.stringify(fields)),
  db.prepare("INSERT INTO schema_types(workspace_id,name,fields_json,version) SELECT 'workspace',name,fields_json,version FROM managed_record_types WHERE true ON CONFLICT(workspace_id,name) DO UPDATE SET fields_json=excluded.fields_json,version=excluded.version"),
  db.prepare("INSERT INTO graph_records(id,tenant_id,workspace_id,kind,fields_json,revision,data_epoch,visibility,owner_id) SELECT id,'orbit','workspace',kind,json_set(fields_json,'$.id',id,'$.owner_id',owner_id,'$.created_at',created_at,'$.updated_at',updated_at),revision,revision,'workspace',owner_id FROM managed_records WHERE true ON CONFLICT(workspace_id,kind,id) DO UPDATE SET fields_json=excluded.fields_json,owner_id=excluded.owner_id,revision=max(graph_records.revision,excluded.revision),data_epoch=max(graph_records.data_epoch,excluded.data_epoch)")
 ];
}
