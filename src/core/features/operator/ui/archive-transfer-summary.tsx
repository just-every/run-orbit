import {decodeTime} from 'ulidx';
import {formatDateTime} from './formatters';
import type {ArchiveStatus} from './archive-transfer';

/** Transfer IDs are generated at job creation. Reading their timestamp preserves the native archive wire contract. */
export function transferStartedAt(status:ArchiveStatus):string|undefined{
 try{return new Date(decodeTime(status.id)).toISOString();}catch{return undefined;}
}
export function transferLabel(status:ArchiveStatus){
 const started=transferStartedAt(status);
 return (started?formatDateTime(started):'Saved transfer')+(status.manifest?' · '+status.manifest.rows.toLocaleString()+' rows · '+status.manifest.parts.toLocaleString()+' parts':'');
}
/** Everyday controls name a transfer by its start and size; the internal transfer code is never shown (Find unfinished transfers resumes one). */
export function ArchiveTransferSummary({kind,status}:{kind:'Export'|'Restore';status?:ArchiveStatus}){
 if(!status)return null;
 return <section className="archive-transfer-summary" aria-label={kind+' transfer'}><p><strong>{kind} started:</strong> {transferLabel(status)}</p></section>;
}
