import {useEffect,useState} from 'react';
import {api} from '../fold-ui/workspace';
import {formatDate} from '../operator/ui/formatters';
interface Entry {source:'entry'|'task'|'handoff';id:string;kind:string;title:string|null;text:string;durationMinutes:number|null;author:string|null;at:string}
const kindNames:Record<string,string>={'manual.note':'Note','manual.call':'Call','manual.meeting':'Meeting',task:'Task note',handoff:'Handoff'};
/** RECORD-017: a shared record's notes, logged calls and meetings, task notes and handoffs, read-only, when the share includes them.
 * A mention notification opens here at #entry-, #task- or #handoff- and the named entry is brought into view. */
export function SharedEntries({base,kind,id}:{base:string;kind:string;id:string}){
 const [data,setData]=useState<{included:boolean;entries:Entry[]}|null>(null),[error,setError]=useState('');
 useEffect(()=>{let live=true;setData(null);api<{included:boolean;entries:Entry[]}>(`${base}/${kind}/${encodeURIComponent(id)}/entries`).then(result=>{if(live){setData(result);setError('');}}).catch(e=>{if(live)setError(e instanceof Error?e.message:'Entries could not be read.');});return()=>{live=false;};},[base,kind,id]);
 useEffect(()=>{const target=data&&window.location.hash?document.getElementById(window.location.hash.slice(1)):null;if(target){target.scrollIntoView({block:'center'});target.focus();}},[data]);
 if(error)return <p role="alert">{error}</p>;
 if(!data)return <p>Loading notes, calls and meetings…</p>;
 if(!data.included)return <p className="fold-hint">Notes, calls and meetings on this record are not shared with you.</p>;
 return <section aria-label="Notes, calls and meetings" className="shared-entries"><h3>Notes, calls and meetings</h3><p className="fold-hint">Shared with you to read; only the team can change them.</p>{data.entries.length?data.entries.map(entry=>{const anchor=`${entry.source}-${entry.id}`;return <article key={anchor} id={anchor} tabIndex={-1} className="fold-row shared-entry"><p><strong>{kindNames[entry.kind]??'Entry'}</strong>{entry.title?`: ${entry.title}`:''}{entry.author?` · ${entry.author}`:''} · <time dateTime={entry.at}>{formatDate(entry.at)}</time>{entry.durationMinutes?` · ${entry.durationMinutes} min`:''}</p><p style={{whiteSpace:'pre-wrap'}}>{entry.text}</p></article>;}):<p>No notes, calls or meetings yet.</p>}</section>;
}
