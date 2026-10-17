import {nativeCatalogGenerations,legacyNativeCatalog} from './archive-generations';
import {catalogSchemaObjects} from './archive-schema-objects';
import {validateManifest as validateV2} from '../../shared/archive-file';
import {lineageHash,validateLineage,validateLineageHashes,type LegacyLineage,type LineageSchema} from '../../shared/archive-lineage';
import {foldDomainTables,type FoldArchiveTable} from './archive-fold-catalog';
import type {ArchiveTable,ArchiveManifest} from './archive-schema';
import {RecordError} from './shared';
export function lineageBaseline(catalog:ArchiveTable[],source:ArchiveManifest):LineageSchema[]{const baseline=source.tables.map(table=>{const current=catalog.find(t=>t.name===table.name) as FoldArchiveTable|undefined;if(!current)throw new RecordError(400,'Legacy source table is absent.');return{name:table.name,columns:current.columns.filter(c=>table.columns.includes(c.name)).map(c=>({name:c.name,type:c.type,notnull:c.notnull,pk:c.pk,dflt_value:c.dflt_value})),objects:current.objects??[]};}).sort((a,b)=>a.name.localeCompare(b.name)) as LineageSchema[];if(baseline.length)baseline[0]!.schemaObjects=catalogSchemaObjects(catalog);return baseline;}
export async function verifyLegacyLineage(value:unknown,catalog:ArchiveTable[]){
 for(const candidate of nativeCatalogGenerations(catalog)){
  try{const receipt=validateLineage(value,candidate.map(t=>({name:t.name,columns:t.columns.map(c=>c.name)})),validateV2);await validateLineageHashes(receipt);if(await lineageHash(lineageBaseline(candidate,receipt.sourceManifest))===receipt.schemaHash)return receipt;}catch{}
 }
 throw new RecordError(400,'Archive legacy evidence does not bind this exact installed owner and native schema.');
}
export async function storedLegacyLineage(db:D1Database,catalog:ArchiveTable[]){const stored=await db.prepare('SELECT receipt_json FROM archive_legacy_lineage WHERE singleton=1').first<{receipt_json:string}>();if(!stored)return;return verifyLegacyLineage(JSON.parse(stored.receipt_json),catalog);}
export async function importedLegacyLineage(db:D1Database,id:string,manifest:ArchiveManifest,catalog:ArchiveTable[]):Promise<LegacyLineage|undefined>{
 const missingNative=(['privacy_matching_contexts','mail_provider_conflicts'] as const).filter(name=>!manifest.tables.some(t=>t.name===name));if(!missingNative.length)return;
 const parts=(await db.prepare('SELECT p.part_index AS "index",p.sha256,i.row_count AS rows FROM archive_parts p JOIN archive_part_inventory i ON i.job_id=p.job_id AND i.part_index=p.part_index WHERE p.job_id=? ORDER BY p.part_index').bind(id).all<{index:number;sha256:string;rows:number}>()).results;
 const baselineSchema=lineageBaseline(legacyNativeCatalog(catalog),manifest),body={version:1 as const,sourceManifest:manifest,missingNative,baselineSchema,schemaHash:await lineageHash(baselineSchema),parts};const receipt={...body,receiptHash:await lineageHash(body)};return verifyLegacyLineage(receipt,catalog);
}
export async function lineageCommitStatements(db:D1Database,id:string,manifest:ArchiveManifest|{version:3;legacyLineage?:LegacyLineage},catalog:ArchiveTable[]){const domain=catalog.filter(t=>!(t.name.startsWith('archive_'))),receipt=manifest.version===2?await importedLegacyLineage(db,id,manifest,domain):manifest.legacyLineage?await verifyLegacyLineage(manifest.legacyLineage,domain):undefined;return[db.prepare('DELETE FROM archive_legacy_lineage'),...(receipt?[db.prepare('INSERT INTO archive_legacy_lineage VALUES(1,?)').bind(JSON.stringify(receipt))]:[])];}
