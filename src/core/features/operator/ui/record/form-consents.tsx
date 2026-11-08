import {formatDateTime} from '../formatters';
import {DetailsGroup} from './details-panel';

export type FormConsent={submissionId:string;kind:string;wording:string;formRevision:number;occurredAt:string};

/** Email permission record: the words a form showed this person, its revision and when they sent it. */
export function FormConsents({entries}:{entries:FormConsent[]}){
 if(!entries.length)return null;
 return <DetailsGroup title="What the form told them">
  <ul className="r-people" data-testid="form-consents">{entries.map(entry=><li className="r-person" key={`${entry.submissionId}:${entry.kind}`}>
   <div>{entry.kind==='marketing_consent'?'Ticked: ':'Enquiry basis: '}“{entry.wording}”</div>
   <div className="r-person-meta">Form revision {entry.formRevision} · {formatDateTime(entry.occurredAt)}</div>
  </li>)}</ul>
 </DetailsGroup>;
}
