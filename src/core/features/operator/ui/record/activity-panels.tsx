import {useEffect,useState} from 'react';
import type {OpportunityDetail} from '../operator-api';
import {EvidenceActions} from '../evidence-actions';
import {ManualEntry} from '../manual-entry';
import {MeetingWriteback} from '../meeting-writeback';
import {ReviewedCall} from '../reviewed-call';
import {recordsRequest,type CustomerRecord,type RecordKind} from '../records-api';

type Contact={id:string;name?:string|null;email?:string|null};

/** Log a call: the call is logged without calling set up; the Call button joins it once Twilio is connected (NK6). */
export function CallPanel({kind,id,contacts,onSaved}:{kind:RecordKind;id:string;contacts:CustomerRecord[];onSaved:()=>void}){
 const [calling,setCalling]=useState(false);
 useEffect(()=>{let live=true;void recordsRequest<{configured:boolean}>('calls/settings').then(status=>{if(live)setCalling(status.configured);}).catch(()=>{});return()=>{live=false;};},[]);
 return <>{calling&&contacts.length?<ReviewedCall contacts={contacts}/>:null}<ManualEntry kind={kind} id={id} contacts={contacts} initialType="call" onSaved={onSaved}/></>;
}

/** Plan a meeting: the calendar planner, or one line to connect a calendar while none is. */
export function MeetingPanel({kind,id,contacts,onChanged}:{kind:'contact'|'opportunity';id:string;contacts:Contact[];onChanged:()=>void}){
 return <MeetingWriteback kind={kind} id={id} contacts={contacts} onChanged={onChanged}/>;
}

/** Add a note: a note ends in Add note; a deal can also log a customer event you verified, as scoring evidence. */
export function NotePanel({opportunity,kind='opportunity',id,contacts,reload}:{opportunity?:OpportunityDetail;kind?:RecordKind;id?:string;contacts:CustomerRecord[];reload:()=>void}){
 return <>
  <ManualEntry kind={kind} id={opportunity?.id??id!} contacts={contacts} onSaved={reload}/>
  {opportunity?<EvidenceActions opportunity={opportunity} reload={reload} mode="activity"/>:null}
 </>;
}
