import type {ArchiveTable,ArchivePart} from './archive-schema';
import {quoteIdentifier,stageLayouts} from './archive-stage-layout';
import {decodeArchiveCell} from './archive-binary';
import {RecordError} from './shared';
function safe(n:number){if(!Number.isSafeInteger(n)||n<0)throw new RecordError(413,'Archive storage plan exceeds safe integer bounds.');return n;}
function sum(expressions:string[]):string{if(!expressions.length)return '0';if(expressions.length===1)return expressions[0]!;const half=Math.floor(expressions.length/2);return `(${sum(expressions.slice(0,half))}+${sum(expressions.slice(half))})`;}
const pages=(bytes:number)=>safe(Math.ceil(bytes*1.3/4096)*4096+8192);
const cell=(name:string)=>`COALESCE(length(CAST(${quoteIdentifier(name)} AS BLOB)),0)`;
function jsonCell(name:string){const c=quoteIdentifier(name);return `CASE typeof(${c}) WHEN 'null' THEN 4 WHEN 'integer' THEN 24 WHEN 'real' THEN 32 WHEN 'blob' THEN 21+4*((length(${c})+2)/3) ELSE length(CAST(json_quote(${c}) AS BLOB))+CASE WHEN substr(${c},1,14)='orbit-cell-v1:' THEN 19 ELSE 0 END END`;}
async function indexColumns(db:D1Database){return(await db.prepare("SELECT s.tbl_name,s.name AS index_name,p.name,p.cid FROM sqlite_master s JOIN pragma_index_xinfo(s.name) p WHERE s.type='index' AND p.key=1 ORDER BY s.tbl_name,s.name,p.seqno").all<{tbl_name:string;index_name:string;name:string|null;cid:number}>()).results;}
type ArchivePayloadSize={typed:number;serialized:number};
type ArchiveTableSize=ArchivePayloadSize&{indexes:number};
type PayloadMeasurement={rows:number;bytes:number;json:number};
/** Export copies need payload and JSON; restore planning also needs actual index keys. */
export function measureArchiveTables(db:D1Database,catalog:ArchiveTable[],name?:((table:string)=>string),mode?:'full'):Promise<ArchiveTableSize>;
export function measureArchiveTables(db:D1Database,catalog:ArchiveTable[],name:((table:string)=>string)|undefined,mode:'export'):Promise<ArchivePayloadSize>;
export async function measureArchiveTables(db:D1Database,catalog:ArchiveTable[],name:(table:string)=>string=t=>t,mode:'full'|'export'='full'):Promise<ArchivePayloadSize|ArchiveTableSize>{
 let typed=0,serialized=0,indexes=0;const indexRows=mode==='full'?await indexColumns(db):undefined,layouts=await stageLayouts(db,catalog);
 for(const table of catalog){const actual=name(table.name),physical=layouts.get(table.name)!.columns,binding=new Map(physical.map((column,index)=>[column.name,actual===table.name?column.name:`c_${index}`])),columns=table.columns.map(c=>binding.get(c.name)!),bytes=sum(physical.map(c=>cell(binding.get(c.name)!))),json=sum(columns.map(jsonCell));
 const tableIndexes=indexRows?[...new Set(indexRows.filter(i=>i.tbl_name===table.name).map(i=>i.index_name))].map(index=>indexRows.filter(i=>i.index_name===index)):undefined;
 const projection=`SELECT count(*) AS rows,COALESCE(SUM(${bytes}),0) AS bytes,COALESCE(SUM(${json}),0) AS json`;
 // Both modes scan each table once. Export snapshots do not recreate indexes,
 // so they omit index metadata, key expressions and the unused aggregate.
 const measurement=tableIndexes?{
  tableIndexes,
  row:await db.prepare(`${projection},COALESCE(SUM(${sum(tableIndexes.map(keys=>keys.some(k=>k.cid<0||!binding.has(k.name!))?bytes:sum(keys.map(k=>cell(binding.get(k.name!)!)))))}),0) AS index_bytes FROM ${quoteIdentifier(actual)}`).first<PayloadMeasurement&{index_bytes:number}>(),
 }:{tableIndexes:undefined,row:await db.prepare(`${projection} FROM ${quoteIdentifier(actual)}`).first<PayloadMeasurement>()};
 if(!measurement.row)throw new Error('Archive size measurement is unavailable.');const row=measurement.row;
 // SQLite record headers, row addresses and page fill reserve. Physical bytes
 // are observed via D1 metadata around writes, not through a physical SQL fence.
 typed=safe(typed+pages(row.bytes+row.rows*(24+physical.length*9)));
 const fields=table.columns.reduce((n,c)=>n+new TextEncoder().encode(JSON.stringify(c.name)).length+2,0);serialized=safe(serialized+pages(row.json+row.rows*(fields+table.name.length+160)));
 if(measurement.tableIndexes?.length){const headers=measurement.tableIndexes.reduce((n,keys)=>n+24+keys.length*9,0);indexes=safe(indexes+pages(measurement.row.index_bytes+row.rows*headers)+measurement.tableIndexes.length*12288);}
 }return mode==='full'?{typed,serialized,indexes}:{typed,serialized};
}

const valueBytes=(value:string|number|null|ArrayBuffer)=>value instanceof ArrayBuffer?value.byteLength:typeof value==='string'?new TextEncoder().encode(value).length:8;
/** Each upload reserves its persisted part, stage, future live cells and index keys. */
export async function uploadedArchiveGrowth(db:D1Database,part:ArchivePart,catalog:ArchiveTable[],binary:boolean){let total=pages(new TextEncoder().encode(JSON.stringify(part)).length),typed=0,indexBytes=0;const indexRows=await indexColumns(db);for(const row of part.records){const decoded=Object.fromEntries(Object.entries(row.row).map(([name,value])=>[name,binary?decodeArchiveCell(value):value])),payload=Object.values(decoded).reduce<number>((n,value)=>n+valueBytes(value),0),bytes=24+Object.keys(row.row).length*9+payload;typed=safe(typed+bytes);if(!catalog.some(t=>t.name===row.table))throw new RecordError(400,'Unknown archive storage table.');for(const index of new Set(indexRows.filter(i=>i.tbl_name===row.table).map(i=>i.index_name))){const keys=indexRows.filter(i=>i.index_name===index);indexBytes=safe(indexBytes+24+keys.length*9+(keys.some(k=>k.cid<0||!(k.name! in decoded))?payload:keys.reduce((n,key)=>n+valueBytes(decoded[key.name!]??null),0)));}}return safe(total+2*pages(typed)+pages(indexBytes));}
