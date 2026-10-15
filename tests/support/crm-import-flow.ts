import assert from 'node:assert/strict';
import {defaultMapping,type ImportInput} from '../../src/core/features/imports/contracts';
export async function json(response:Response){const body=await response.json() as any;assert.ok(response.ok,`${response.status}: ${JSON.stringify(body)}`);return body;}
export async function finish(f:any,review:any,action='apply'){let result;for(let i=0;i<100;i++){result=await json(await f.request(`imports/${review.id}/${action}`,'POST',action==='apply'?{fingerprint:review.fingerprint,confirmed:true}:{confirmed:true}));if(!result.job||['completed','undone','rolled_back'].includes(result.job.state))return result;}throw new Error('Import did not reach a terminal state.');}

/** Exercise the spreadsheet path through the same reviewed HTTP import door as vendor files. */
export async function genericCsvFlow(f:any){
 const existing=await f.customer('generic-existing@example.test');
 await json(await f.request(`records/contact/${existing.contactId}`,'PUT',{name:'Native details',contactability:'do_not_contact'}));
 const headers=['email','name','company'],rows=[' MAYA-GENERIC@EXAMPLE.TEST ,Maya Spreadsheet,Shared spreadsheet','ari-generic@example.test,Ari Spreadsheet,Shared spreadsheet',`${existing.email},Incoming replacement,Unused spreadsheet company`,'not-an-email,Rejected person,'];
 const source:ImportInput={vendor:'csv',account:'Personal spreadsheet',files:[{kind:'contact',name:'my-contacts.csv',csv:[headers.join(','),...rows].join('\r\n'),mapping:defaultMapping('csv','contact',headers),separator:';'}],stages:{},contactability:'mapped_permission'};
 const count=()=>f.db.prepare('SELECT count(*) n FROM contacts').first('n'),before=await count();
 const dry=await json(await f.request('imports/dry-run','POST',source));assert.equal(await count(),before);assert.equal(dry.counts.rejected,1);
 assert.match(dry.rows.find((row:any)=>row.status==='rejected').reason,/valid email/);
 const contactRows=dry.rows.filter((row:any)=>row.kind==='contact');
 for(const [index,row] of contactRows.entries()){const [email,name]=rows[index].split(',');assert.ok(row.displayName.includes(name));assert.ok(row.displayName.includes(email.trim()));}
 const reopened=await json(await f.request(`imports/${dry.id}`));assert.deepEqual(reopened.rows,dry.rows,'Reopening a saved review retains readable labels, including rejected rows');
 assert.equal(dry.rows.find((row:any)=>row.recordId===existing.contactId).status,'linked');
 assert.equal((await f.request(`imports/${dry.id}/apply`,'POST',{fingerprint:'0'.repeat(64),confirmed:true})).status,409);
 await finish(f,dry);assert.equal(await count(),before+2);
 const person=await f.db.prepare("SELECT * FROM contacts WHERE email='maya-generic@example.test'").first(),colleague=await f.db.prepare("SELECT * FROM contacts WHERE email='ari-generic@example.test'").first();
 assert.equal(person.name,'Maya Spreadsheet');assert.equal(person.contactability,'do_not_contact');assert.ok(person.company_id);assert.equal(person.company_id,colleague.company_id);
 assert.equal(JSON.parse(JSON.parse(person.custom_fields_json).import_source).vendor,'csv');
 assert.equal((await f.records.detail('contact',existing.contactId)).record.name,'Native details');assert.equal((await f.records.detail('contact',existing.contactId)).record.contactability,'do_not_contact');
 assert.equal(await f.db.prepare("SELECT id FROM companies WHERE name='Unused spreadsheet company'").first(),null);
 const replaySource=structuredClone(source);replaySource.files[0].name='reordered.csv';replaySource.files[0].csv=[headers.join(','),...rows.toReversed()].join('\r\n');
 const replay=await json(await f.request('imports/dry-run','POST',replaySource));await finish(f,replay);assert.equal(await count(),before+2);
 await finish(f,replay,'undo');assert.ok(await f.db.prepare('SELECT id FROM contacts WHERE id=?').bind(person.id).first());
 await finish(f,dry,'undo');assert.equal(await count(),before);assert.equal(await f.db.prepare('SELECT id FROM companies WHERE id=?').bind(person.company_id).first(),null);
 assert.equal((await f.records.detail('contact',existing.contactId)).record.contactability,'do_not_contact');
 const duplicates=structuredClone(source);duplicates.account='Duplicate spreadsheet';duplicates.files[0].csv='email,name,company\r\nsame@example.test,First,\r\n SAME@example.test ,Second,';
 const duplicateReview=await json(await f.request('imports/dry-run','POST',duplicates));assert.equal(duplicateReview.counts.rejected,2);assert.equal(await count(),before);
 const mappedId=structuredClone(source);mappedId.files[0].csv='id,email,name\r\n,valid@example.test,Missing ID';mappedId.files[0].mapping={id:'id',email:'email',name:'name'};
 const emptyIdReview=await json(await f.request('imports/dry-run','POST',mappedId));assert.equal(emptyIdReview.counts.rejected,1);assert.match(emptyIdReview.rows[0].reason,/Source ID is empty/);
 assert.ok(emptyIdReview.rows[0].displayName.includes('Missing ID'));assert.ok(emptyIdReview.rows[0].displayName.includes('valid@example.test'));
 const vendor=structuredClone(source);vendor.vendor='hubspot';assert.equal((await f.request('imports/dry-run','POST',vendor)).status,409);
}
