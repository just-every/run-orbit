import {validateLineageHashes} from './archive-lineage.ts';
import {archiveLines} from './archive-lines.ts';
import type {ArchiveManifest,ArchivePart,ArchiveEntry} from './archive-transfer-profile.ts';
/** The v2 JSON document is framed on lines so neither client retains the archive. */
export async function* readArchiveStream(source:ReadableStream<Uint8Array>,validateManifest:(value:unknown)=>ArchiveManifest):AsyncGenerator<ArchiveEntry>{
 let manifest:ArchiveManifest|undefined,index=0,closed=false;
 const counts=new Map<string,number>();
 for await(const line of archiveLines(source,16_777_218)){
  const text=line.trim();if(!text)continue;
  if(closed)throw new Error('Archive contains data after its closing record.');
  if(!manifest){
   if(!/,\s*"parts"\s*:\s*\[$/.test(text))throw new Error('Choose a complete Orbit streaming archive.');
   const header=JSON.parse(text.replace(/,\s*"parts"\s*:\s*\[$/,'}'));
   if(header.format!=='orbit-export'||![2,3].includes(header.version))throw new Error('Unsupported archive format.');
   manifest=validateManifest(header.manifest);if(manifest.legacyLineage)await validateLineageHashes(manifest.legacyLineage);if(header.version!==manifest.version)throw new Error('Archive generation discriminators disagree.');yield {kind:'manifest',manifest};continue;
  }
  if(text===']}'){closed=true;continue;}
  if((index===0&&text.startsWith(','))||(index>0&&!text.startsWith(',')))throw new Error('Archive JSON part separators are invalid.');
  const raw=text.startsWith(',')?text.slice(1):text;
  if(new TextEncoder().encode(raw).byteLength>16_777_216)throw new Error('Archive part exceeds 16 MiB.');
  const part=JSON.parse(raw) as ArchivePart;
  if(part.index!==index||typeof part.sha256!=='string'||!/^[a-f0-9]{64}$/.test(part.sha256)||!Array.isArray(part.records)||part.records.length<1||part.records.length>1000)throw new Error('Archive part sequence or checksum is invalid.');
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(part.records)));
  const hash=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
  if(hash!==part.sha256)throw new Error(`Archive part ${index} does not match its checksum.`);
  if(index>=manifest.parts)throw new Error('Archive contains more parts than its manifest.');
  for(const record of part.records){
   const table=manifest.tables.find(table=>table.name===record.table),count=counts.get(record.table)??0;
   if(!table||record.index!==count||count>=table.rows||!record.row||Array.isArray(record.row)||Object.keys(record.row).length!==table.columns.length||table.columns.some(column=>!Object.hasOwn(record.row,column)))throw new Error('Archive row inventory is invalid.');
   if(Object.values(record.row).some(value=>value!==null&&typeof value!=='string'&&(typeof value!=='number'||!Number.isFinite(value))))throw new Error('Archive row values are invalid.');
   counts.set(record.table,count+1);
  }
  yield {kind:'part',part,raw};index++;
 }
 if(!manifest||!closed||index!==manifest.parts||manifest.tables.some(table=>(counts.get(table.name)??0)!==table.rows))throw new Error('Archive is incomplete; restore has not been finalized.');
}
