import type {ArchivePart,ArchiveTable} from '../records/archive-schema';
import type {FoldArchiveTable} from '../records/archive-fold-catalog';
/** Reconstruct the complete pre-0057 table, including SQLite's appended-column DDL. */
export const preCaptureMailRuleCatalog=(catalog:ArchiveTable[])=>catalog.map(table=>{
 if(table.name!=='workspace_settings')return table;
 const objects=(table as FoldArchiveTable).objects;
 return {...table,columns:table.columns.filter(column=>column.name!=='capture_mail_rule'),...(objects?{objects:objects.map(object=>object.type==='table'&&object.sql?{...object,sql:object.sql.replace(/, capture_mail_rule TEXT NOT NULL DEFAULT 'review' CHECK\(capture_mail_rule IN\('review','recent','all'\)\)/i,'')}:object)}:{})};
});
/** Apply only the additive migration default after validating a historical row. */
export function upgradeCaptureMailRuleArchiveRecord(record:ArchivePart['records'][number]){
 return record.table==='workspace_settings'?{...record,row:{capture_mail_rule:'review',...record.row}}:record;
}
