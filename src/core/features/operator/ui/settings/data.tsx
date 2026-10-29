import {DuplicateReview} from '../duplicate-review';
import {WorkspaceArchiveTools} from '../WorkspaceArchiveTools';
import {SettingsArea} from './area';
import {LinkCard} from './link-card';

const contactFields=['name','email','phone','job_title','timezone','company_id','custom_fields_json'],companyFields=['name','primary_domain','custom_fields_json'];

/** Settings › Data: moving records in, duplicate review and the workspace archive. */
export function DataArea(){
 return <SettingsArea title="Data">
  <LinkCard title="Move in" text="Bring customer records in from a CSV, HubSpot or Pipedrive export." href="/app/settings/data/import" action="Start an import"/>
  <section className="operator-surface settings-card" aria-labelledby="data-duplicates"><h2 id="data-duplicates">Duplicates</h2>
   <p className="settings-card__line">Review contacts or companies with matching names, then merge them.</p>
   <div className="settings-card__actions"><DuplicateReview kind="contact" fields={contactFields}/><DuplicateReview kind="company" fields={companyFields}/></div>
  </section>
  <WorkspaceArchiveTools/>
 </SettingsArea>;
}
