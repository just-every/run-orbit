import {label} from './formatters';

/** Read old provider reports honestly as well as newly classified receipts. */
export function mailEvidenceTitle(kind:string,signalType?:string){
 const type=signalType??kind;
 if(type==='message.accepted'||type==='provider.processed')return 'Accepted by mail provider';
 if(type==='provider.delivered')return 'Delivery reported by mail provider';
 if(type==='provider.open'||type==='email.opened')return 'Open reported · inferred';
 if(type==='provider.click')return 'Link click reported · inferred';
 if(type==='email.replied')return 'Human reply';
 if(type.endsWith(':email.auto_replied'))return 'Automatic reply · not a human response';
 return label(type);
}

export function MailEvidenceNote({kind,signalType}:{kind:string;signalType?:string}){
 const type=signalType??kind;
 if(['provider.open','provider.click','email.opened'].includes(type))return <p>Inferred, unverified report; it may come from a privacy proxy or automated scanner. It does not prove reading, intent or a human response. Open/click not tracked by Orbit.</p>;
 if(type.endsWith(':email.auto_replied'))return <p>Automatic mail does not stop follow-up or count as a human reply.</p>;
 if(type==='message.accepted'||type==='provider.processed')return <p>Provider acceptance does not confirm delivery or a human response.</p>;
 if(type==='provider.delivered')return <p>Provider-reported delivery does not confirm reading or a human response.</p>;
 return null;
}
