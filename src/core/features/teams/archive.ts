import type {ArchiveTable,ArchivePart} from '../records/archive-schema';
import type {FoldArchiveTable} from '../records/archive-fold-catalog';
import {salesTeamArchiveTables} from '../../shared/archive-lineage';
/** Reconstruct the exact complete generation before native teams were added. */
export function preTeamsCatalog(catalog:ArchiveTable[]):ArchiveTable[]{return catalog.filter(table=>!(salesTeamArchiveTables as readonly string[]).includes(table.name)).map(table=>{
 if(table.name==='sending_limits'){const objects=(table as FoldArchiveTable).objects;return{...table,...(objects?{objects:objects.map(object=>object.type==='table'&&object.sql?{...object,sql:object.sql.replace(/ OR id LIKE 'sequence:%' OR id LIKE 'team:one-to-one:%' OR id LIKE 'team:sequence:%'/,'').replace(/CREATE TABLE "sending_limits"/,'CREATE TABLE sending_limits')}:object)}:{})};}
 const column=table.name==='message_library'?'team_id':table.name==='slack_channels'?'audience_team_id':null;if(!column)return table;
 const objects=(table as FoldArchiveTable).objects;
 return{...table,columns:table.columns.filter(c=>c.name!==column),...(objects?{objects:objects.filter(object=>object.name!=='message_library_team').map(object=>object.type==='table'&&object.sql?{...object,sql:object.sql.replace(new RegExp(', '+column+' TEXT','i'),'')}:object)}:{})};
});}
export function upgradeTeamArchiveRecord(record:ArchivePart['records'][number]){
 if(record.table==='message_library')return{...record,row:{team_id:null,...record.row}};
 if(record.table==='slack_channels')return{...record,row:{audience_team_id:null,...record.row}};
 return record;
}
