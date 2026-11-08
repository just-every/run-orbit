import type {ContactBasis} from './contact-basis';
import {formatDateTime} from '../operator/ui/formatters';
import type {WorkspacePresentation} from '../operator/ui/operator-api';

export function SubmissionBasis({basis,presentation}:{basis:ContactBasis|null;presentation:WorkspacePresentation|null}){
 if(!basis)return null;
 return <section aria-label="Contact basis"><h4>{basis.kind==='inquiry'?'Inquiry follow-up':'Marketing consent'}</h4><p>{basis.wording}</p><p>{basis.kind==='inquiry'?'One-to-one follow-up requested':basis.accepted?'Checkbox ticked':'Checkbox not ticked'} · Form revision {basis.formRevision}</p><p>Recorded {presentation?formatDateTime(basis.occurredAt,presentation):basis.occurredAt}</p><p>Existing sending stops always apply.</p></section>;
}
