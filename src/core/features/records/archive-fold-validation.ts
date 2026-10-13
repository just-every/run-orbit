import {validateTransferManifest} from '../../shared/archive-transfer-profile';
import {validateManifest as validateV2} from '../../shared/archive-file';
import {verifyLegacyLineage} from './archive-lineage';
import type {LegacyLineage} from '../../shared/archive-lineage';
import {decodeArchiveCell} from './archive-binary';
import {validArchiveCounts} from '../../shared/archive-counts';
import {z} from 'zod';
import {manifestSchema,validatePart,ARCHIVE_PART_BYTES,ARCHIVE_PART_ROWS,type ArchiveManifest,type ArchiveTable,type ArchivePart} from './archive-schema';
import {foldInstalledCatalog,foldDomainTables,foldKnownNativeAdditions,foldSchemaHash} from './archive-fold-catalog';
import {RecordError} from './shared';
export const foldManifestSchema=manifestSchema.extend({version:z.literal(3),generation:z.literal('orbit-fold-1'),schemaHash:z.string().regex(/^[a-f0-9]{64}$/),legacyLineage:z.custom<LegacyLineage>().optional(),tables:z.array(manifestSchema.shape.tables.element).max(100+foldDomainTables.length+foldKnownNativeAdditions.length)}).strict();
export const transferManifestSchema=z.union([manifestSchema,foldManifestSchema]);
export async function validateFoldManifest(db:D1Database,input:unknown){const parsed=transferManifestSchema.safeParse(input);if(!parsed.success)throw new RecordError(400,'Invalid archive generation or manifest.');const manifest=parsed.data,catalog=await foldInstalledCatalog(db),domain=new Set<string>(foldDomainTables),base=catalog.filter(t=>!domain.has(t.name));
 try{validateTransferManifest(manifest,validateV2);if(manifest.version===3&&manifest.legacyLineage)await verifyLegacyLineage(manifest.legacyLineage,catalog);}catch{throw new RecordError(400,'Invalid complete archive lineage.');}
 const generations:ArchiveTable[][]=manifest.version===3?[catalog]:[base,base.filter(t=>t.name!=='mail_provider_conflicts'),base.filter(t=>!['privacy_matching_contexts','mail_provider_conflicts'].includes(t.name)).map(t=>t.name==='contacts'?{...t,columns:t.columns.filter(c=>c.name!=='contactability_revision')}:t)];
 const inputCatalog=generations.find(candidate=>manifest.tables.length===candidate.length&&new Set(manifest.tables.map(t=>t.name)).size===candidate.length&&candidate.every(table=>{const supplied=manifest.tables.find(t=>t.name===table.name);return supplied&&JSON.stringify(supplied.columns)===JSON.stringify(table.columns.map(c=>c.name));}));
 if(!inputCatalog||!validArchiveCounts(manifest)||manifest.version===3&&manifest.schemaHash!==await foldSchemaHash(catalog))throw new RecordError(400,'Archive inventory does not match a complete supported source generation.');
 return{manifest,catalog,inputCatalog};
}
export function validateFoldPart(input:unknown,catalog:ArchiveTable[],manifest:z.infer<typeof transferManifestSchema>):ArchivePart{
 if(manifest.version===2)return validatePart(input,catalog,manifest);
 const schema=z.object({index:z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),sha256:z.string().regex(/^[a-f0-9]{64}$/),records:z.array(z.object({table:z.string(),index:z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),row:z.record(z.string(),z.union([z.string(),z.number().finite(),z.null()]))}).strict()).min(1).max(ARCHIVE_PART_ROWS)}).strict(),parsed=schema.safeParse(input);
 if(!parsed.success||new TextEncoder().encode(JSON.stringify(input)).length>ARCHIVE_PART_BYTES)throw new RecordError(400,'Invalid or oversized archive part.');
 for(const record of parsed.data.records){const table=catalog.find(t=>t.name===record.table),expected=manifest.tables.find(t=>t.name===record.table);if(!table||!expected||record.index>=expected.rows||Object.keys(record.row).length!==table.columns.length)throw new RecordError(400,'Invalid archive row inventory.');for(const column of table.columns){const value=record.row[column.name];if(value===undefined||value===null&&column.notnull)throw new RecordError(400,'Invalid archive storage value.');const decoded=decodeArchiveCell(value);if(decoded!==null&&!(decoded instanceof ArrayBuffer)&&(column.type.toUpperCase().includes('INT')?typeof decoded!=='number'||!Number.isSafeInteger(decoded):column.type.toUpperCase()==='REAL'?typeof decoded!=='number':typeof decoded!=='string'))throw new RecordError(400,`Invalid value in ${record.table}.${column.name}.`);}}
 return parsed.data;
}
