import type {ImportInput} from '../../src/core/features/imports/contracts';
import {presets} from '../../src/core/features/imports/contracts';
const csv=(headers:string[],rows:string[][])=>[headers,...rows].map(row=>row.map(value=>'"'+value.replaceAll('"','""')+'"').join(',')).join('\r\n');
/** Synthetic documented export shapes; notes and suppression headers use the explicit moving-guide recipes. */
export function crmFixture(vendor:'hubspot'|'pipedrive',stage:string,count=120):ImportInput{
 const preset=presets[vendor],files:ImportInput['files']=[],add=(kind:ImportInput['files'][number]['kind'],mapping:Record<string,string>,rows:Record<string,string>[])=>{const fields=Object.keys(mapping);files.push({kind,name:`${vendor}-${kind}.csv`,mapping,separator:';',csv:csv(Object.values(mapping),rows.map(row=>fields.map(field=>row[field]??'')))});};
 add('company',preset.company,[{id:'org-1',name:'Synthetic Orchard',domain:`${vendor}.example.test`,owner:'Export owner (historical)',description:'Historical company'}]);
 add('contact',{...preset.contact,permission:'Marketing status'},Array.from({length:count},(_,i)=>({id:`person-${i}`,name:`Synthetic Person ${i}`,first_name:'Synthetic',last_name:`Person ${i}`,email:`${vendor}-${i}@example.test`,company_ids:'org-1',permission:'subscribed',dnc:i===0?'true':'false'})));
 add('deal',preset.deal,[{id:'deal-1',title:'Synthetic account sale',company_ids:'org-1',contact_ids:'person-0;person-1',stage:'Qualified',owner:'Historical owner',amount:'1250.25',close_date:'2027-01-01'}]);
 add('note',preset.note,[{id:'note-1',text:'Customer said: "Ready"\nFollow up after review. <script>not executable</script>',occurred_at:'2026-09-01T12:00:00Z',contact_ids:'person-0',company_ids:'org-1',deal_ids:'deal-1',owner:'Historical note author'},{id:'invalid-note',text:'Reject with an explicit reason',occurred_at:'not-a-date',contact_ids:'person-0'}]);
 add('suppression',{email:'Email'},[{email:`${vendor}-standalone@example.test`}]);
 return {vendor,account:`Synthetic ${vendor} export`,files,stages:{Qualified:stage}};
}
