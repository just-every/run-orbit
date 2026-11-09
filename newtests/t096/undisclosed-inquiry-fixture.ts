import assert from 'node:assert/strict';
import type {fixture} from './fixture';
import {FormService} from '../../src/core/features/forms/service';
import {compileLanding} from '../../src/core/features/publication/fixed-compiler';
import {sha256} from '../../src/core/features/access/mutations';

/** Persist the pre-disclosure artifact shape, then approve and publish normally.
 * The immutable artifact is fixture data, not a replacement capture service. */
export async function undisclosedInquiry(f:Awaited<ReturnType<typeof fixture>>,slug='undisclosed-inquiry'){
 const forms=new FormService(f.db),saved=await forms.save(await f.nativeContext(),{form:{title:'Existing production enquiries',fields:[{id:'name',label:'Name',required:true},{id:'email',label:'Email',required:true}],consentWording:null},landing:{title:'Production enquiries',heading:'Talk about your production rollout',paragraphs:['Tell our team how to contact you.']}});
 const operationId=crypto.randomUUID(),artifactId=crypto.randomUUID(),authorityId=crypto.randomUUID(),now=new Date().toISOString();
 const html=compileLanding({form:saved.form,landing:saved.landing,slug,revision:saved.revision,operationId}).replace(/<p id="inquiry-disclosure">[^<]*<\/p>/,'');
 assert.ok(!html.includes('id="inquiry-disclosure"'));
 const hash=await sha256(html);
 await f.db.batch([
  f.db.prepare("INSERT INTO content_entities VALUES(?,'artifact',1,?,?,?,?)").bind(artifactId,JSON.stringify({html}),hash,f.operator.operatorId,now),
  f.db.prepare('INSERT INTO access_form_authorities VALUES(?,?,?,?,?,?,0,?,NULL)').bind(authorityId,saved.id,saved.revision,f.operator.operatorId,hash,10,new Date(Date.now()+86400000).toISOString()),
  f.db.prepare("INSERT INTO publication_operations VALUES(?,?,?,?,?,?,?,'compiled',NULL,NULL,NULL,NULL)").bind(operationId,slug,saved.id,saved.revision,artifactId,hash,authorityId),
 ]);
 await forms.approve(await f.nativeContext(),operationId,{artifactHash:hash,formRevision:saved.revision});
 await forms.publish(await f.nativeContext(),operationId);
 return {forms,saved,compiled:{operationId,artifactId,hash,html},slug};
}
