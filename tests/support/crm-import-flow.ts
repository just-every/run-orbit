import assert from 'node:assert/strict';
import {parseCsv} from '../../src/core/shared/csv';
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

/** Stop after real committed batches, replace the persisted D1 proxy and application, then use the same native review. */
export async function resumeImportFlow(f:any,review:any,stopped:any,scheduled:any){
 const partial=await json(await f.request(`imports/${review.id}/apply`,'POST',{fingerprint:review.fingerprint,confirmed:true}));
 assert.equal(partial.job.state,'applying');assert.ok(partial.job.checkpoint>1&&partial.job.checkpoint<partial.job.total);
 const progress=await importProgress(f,partial.job.id),native=await importRecords(f);
 assert.ok(progress.effects.length>1);assert.ok(progress.batches.length>1);
 assert.equal(progress.batches[0].position,0);assert.equal(progress.batches[0].end_position,1,'The suppression entry commits in its own batch before customer creation');
 assert.equal((await json(await f.request(`records/contact/${stopped.contactId}`))).record.contactability,'do_not_contact');
 assert.equal(await f.db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(scheduled.id).first('state'),'cancelled');
 assert.equal(progress.effects[0].target_kind,'suppression','Suppression owns the first committed effect, before customer records');
 assert.ok(progress.effects.slice(1).some((row:any)=>row.target_kind==='contact'));
 await f.restart();
 const reopened=await json(await f.request(`imports/${review.id}`));
 assert.equal(reopened.fingerprint,review.fingerprint);assert.deepEqual(reopened.rows,review.rows);
 assert.equal(reopened.job.id,partial.job.id);assert.equal(reopened.job.checkpoint,partial.job.checkpoint);assert.equal(reopened.job.state,'applying');
 assert.deepEqual(await importProgress(f,partial.job.id),progress,'Restart retains checkpoint, batches, source claims and effect identities');
 assert.deepEqual(await importRecords(f),native,'Restart retains every committed native record, association and note');
 const completed=await finish(f,review);assert.equal(completed.job.id,partial.job.id);assert.equal(completed.job.state,'completed');assert.equal(completed.job.checkpoint,partial.job.total);
 const final=await importProgress(f,partial.job.id);
 for(const key of ['effects','batches','entries','sources'] as const){assert.deepEqual(final[key].slice(0,progress[key].length),progress[key],`Resume preserves committed ${key}`);}
 assert.equal(new Set(final.effects.map((row:any)=>row.id)).size,final.effects.length);
 assert.equal(new Set(final.entries.map((row:any)=>row.source_identity)).size,completed.job.total);
 return {checkpoint:partial.job.checkpoint,total:partial.job.total,job:partial.job.id};
}
async function importProgress(f:any,job:string){
 const read=(table:string,order:string)=>f.db.prepare(`SELECT * FROM ${table} WHERE job_id=? ORDER BY ${order}`).bind(job).all().then((result:any)=>result.results);
 return {effects:await read('ik_provenance','ordinal,effect_ordinal'),batches:await read('ik_batches','fence'),entries:await read('ik_d1_entries','ordinal'),sources:await f.db.prepare('SELECT s.* FROM ik_sources s JOIN ik_d1_entries e ON e.source_identity=s.identity WHERE e.job_id=? ORDER BY e.ordinal').bind(job).all().then((result:any)=>result.results)};
}
async function importRecords(f:any){
 const result:Record<string,unknown>={};
 for(const table of ['contacts','companies','opportunities','opportunity_contacts','timeline_entries','timeline_entry_records'])result[table]=(await f.db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()).results;
 return result;
}

/** A changed row keeps its vendor, account and source identity and must never overwrite the imported native graph. */
export async function sourceConflictFlow(f:any,source:ImportInput){
 const changed=structuredClone(source),file=changed.files.find(file=>file.kind==='contact')!;
 const [headers,...rows]=parseCsv(file.csv);rows[0][headers.indexOf(file.mapping.name??file.mapping.first_name)]='Changed source person';
 file.csv=[headers,...rows].map(row=>row.map(value=>'"'+value.replaceAll('"','""')+'"').join(',')).join('\r\n');
 assert.notEqual(file.csv,source.files.find(file=>file.kind==='contact')!.csv);
 const native=await importRecords(f),review=await json(await f.request('imports/dry-run','POST',changed));
 assert.equal(review.counts.rejected,1);assert.ok(review.rows.some((row:any)=>row.kind==='contact'&&row.sourceId==='person-0'));
 let conflict:Response|undefined;
 for(let batch=0;batch<100;batch++){
  const response=await f.request(`imports/${review.id}/apply`,'POST',{fingerprint:review.fingerprint,confirmed:true});
  if(!response.ok){conflict=response;break;}
  assert.notEqual((await json(response)).job.state,'completed','A changed source identity cannot complete silently');
 }
 assert.ok(conflict);assert.equal(conflict.status,409);assert.match((await conflict.json() as any).error,/SOURCE_ID_CONTENT_CONFLICT/);
 assert.deepEqual(await importRecords(f),native,'Source conflict preserves native fields, associations and notes');
 const retained=await json(await f.request(`imports/${review.id}`));assert.notEqual(retained.job.state,'completed');
 await finish(f,review,'undo');assert.deepEqual(await importRecords(f),native,'Undo of the refused import cannot steal the original effects');
}

/** Invalid suppression input must refuse the entire review before any customer or sending state changes. */
export async function malformedSuppressionFlow(f:any,source:ImportInput){
 const malformed=structuredClone(source);malformed.files.find(file=>file.kind==='suppression')!.csv+='\r\n"synthetic-orbit-invalid"';
 const native=await importRecords(f),messages=(await f.db.prepare('SELECT * FROM outbound_messages ORDER BY id').all()).results;
 const review=await json(await f.request('imports/dry-run','POST',malformed)),rejected=review.rows.find((row:any)=>row.kind==='suppression'&&row.status==='rejected');
 assert.ok(rejected);assert.match(rejected.reason,/Suppression email is invalid/);assert.ok(rejected.location.artifact.endsWith('.csv'));assert.ok(rejected.location.row>1);
 const refused=await f.request(`imports/${review.id}/apply`,'POST',{fingerprint:review.fingerprint,confirmed:true});assert.equal(refused.status,409);assert.match((await refused.json() as any).error,/Resolve all rejected suppression rows/);
 assert.equal((await json(await f.request(`imports/${review.id}`))).job,null);assert.deepEqual(await importRecords(f),native);assert.deepEqual((await f.db.prepare('SELECT * FROM outbound_messages ORDER BY id').all()).results,messages);
 await finish(f,review,'undo');
}
