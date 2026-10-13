import {identityMatch,identityPatterns} from '../records/erasure-identity';
import type {Fact} from './facts';

/** Source text retained by the signal, original or proposal, including excerpts beyond raw display limits. */
export function retainedEvidenceText(fact:Fact){
 const text=[fact.headers,fact.body,fact.subject,...fact.quote,...fact.participants.flatMap(person=>[person.email,person.name])];
 if(fact.kind==='message')text.push(fact.senderLine,fact.unsubscribe??'',fact.phone?.line??'',fact.phone?.value??'',fact.bounce?.recipient??'',fact.bounce?.status??'',fact.bounce?.diagnostic??'');
 return text.join('\n');
}

const originalColumns=['i.headers','i.body'];
const proposalColumns=['p.details_json','p.current_value','p.proposed_value','p.decided_value'];
/** Both transaction-time erasure and legacy proof collection must select the same originals (signals alias s). */
export const retainedEvidenceIdentityMatch=`(${identityMatch('s.payload_json')}
 OR s.id IN(SELECT i.signal_id FROM capture_items i WHERE ${originalColumns.map(identityMatch).join(' OR ')})
 OR s.id IN(SELECT p.signal_id FROM capture_proposals p WHERE ${proposalColumns.map(identityMatch).join(' OR ')}))`;
export const retainedEvidenceIdentityPatterns=(email:string)=>Array.from({length:1+originalColumns.length+proposalColumns.length},()=>identityPatterns(email)).flat();
