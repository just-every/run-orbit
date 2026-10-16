import {fieldLabel} from '../operator/ui/data-value';

const names:Record<string,string>={
 id:'Record',value_cents:'Estimated value',stage_id:'Pipeline stage',owner_id:'Owner',company_id:'Company',
 lifecycle:'Status',band:'Priority band',queue_state:'Queue',created_at:'Created date',updated_at:'Last updated',
 expected_close_at:'Expected close date',closed_at:'Closed date',closed_by:'Closed by',next_due_at:'Next action due',
 last_contributing_signal_at:'Latest contributing activity',custom_fields_json:'Custom fields',contactability:'Permission to contact',
};
export const reportFieldLabel=(field:string)=>names[field]??fieldLabel(field);
