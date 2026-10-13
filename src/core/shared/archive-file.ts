import {readArchiveStream} from './archive-stream-parser.ts';
import {validateTransferManifest} from './archive-transfer-profile.ts';
export interface ArchiveManifest {format:'orbit-export';version:2;exportedAt:string;tables:{name:string;columns:string[];rows:number}[];parts:number;rows:number}
export interface ArchivePart {index:number;sha256:string;records:{table:string;index:number;row:Record<string,string|number|null>}[]}
export type ArchiveEntry={kind:'manifest';manifest:ArchiveManifest}|{kind:'part';part:ArchivePart;raw:string};
export function validateManifest(value:unknown):ArchiveManifest{
 const item=value as ArchiveManifest;
 if(!item||item.format!=='orbit-export'||item.version!==2||typeof item.exportedAt!=='string'||!Number.isFinite(Date.parse(item.exportedAt))||!Number.isSafeInteger(item.parts)||item.parts<0||!Number.isSafeInteger(item.rows)||item.rows<0||!Array.isArray(item.tables)||item.tables.length>100)throw new Error('Unsupported archive manifest.');
 const seen=new Set<string>();
 for(const table of item.tables){if(!table||!/^[a-z_][a-z0-9_]*$/.test(table.name)||seen.has(table.name)||!Number.isSafeInteger(table.rows)||table.rows<0||!Array.isArray(table.columns)||table.columns.length<1||table.columns.length>100||table.columns.some(column=>typeof column!=='string'||!/^[a-z_][a-z0-9_]*$/.test(column))||new Set(table.columns).size!==table.columns.length)throw new Error('Invalid archive table manifest.');seen.add(table.name);}
 if(item.tables.reduce((sum,table)=>sum+table.rows,0)!==item.rows)throw new Error('Archive total rows do not match its tables.');
 return item;
}
/** Complete streaming dispatch; validateManifest above remains exactly the native v2 validator. */
export function readArchiveFile(source:ReadableStream<Uint8Array>){return readArchiveStream(source,value=>validateTransferManifest(value,validateManifest));}
