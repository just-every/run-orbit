import {fieldLabel} from '../operator/ui/data-value';

const names:Record<string,string>={
 id:'Record',value_cents:'Estimated value',stage_id:'Pipeline stage',owner_id:'Owner',company_id:'Company',
 lifecycle:'Status',band:'Priority band',queue_state:'Queue',created_at:'Created date',updated_at:'Last updated',
 expected_close_at:'Expected close date',closed_at:'Closed date',closed_by:'Closed by',next_due_at:'Next action due',
 last_contributing_signal_at:'Latest contributing activity',custom_fields_json:'Custom fields',contactability:'Permission to contact',
 pipeline_id:'Pipeline',position:'Stage order',due_at:'Due date',scheduled_at:'Scheduled date',operator_id:'Approving operator',source_event_id:'Source event',type:'Source type',
};
export const reportFieldLabel=(field:string)=>names[field]??fieldLabel(field);
const sourceNames:Record<string,string>={opportunities:'Deals',pipeline_stage_rules:'Pipeline rules',pipeline_stages:'Pipeline stages',timeline_entries:'Activity',outbound_messages:'Reviewed messages',sales_tasks:'Tasks',signals:'Customer events',signal_sources:'Event sources',signal_links:'Linked customer records'};
const events:Record<string,string>={'stage.changed':'Stage changes','manual.note':'Notes','manual.call':'Calls','manual.meeting':'Meetings','message.accepted':'Messages accepted for sending','meeting.booked':'Meetings booked','meeting.cancelled':'Meetings cancelled','provider.delivered':'Reported deliveries','provider.open':'Reported opens','email.replied':'Customer replies','email.opened':'Reported opens','*:email.auto_replied':'Automatic replies'};
/** Keep the stored source keys in exports; show record and field names on pages. */
export function reportSourceLabel(source:string){
 const [table,event]=source.split(' ');
 if(event)return `${sourceNames[table!]??fieldLabel(table!)}: ${events[event]??fieldLabel(event)}`;
 const [record,field]=source.split('.');
 return `${sourceNames[record!]??fieldLabel(record!)}${field?`: ${reportFieldLabel(field)}`:''}`;
}
