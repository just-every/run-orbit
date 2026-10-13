import assert from 'node:assert/strict';
import {loadPlans} from '../../src/modules/import-kit/d1/plans';
import {json} from './crm-import-flow';
import type {launchFixture} from './launch-fixture';
type Fixture=Awaited<ReturnType<typeof launchFixture>>;

/** Inspect decoded content as well as the serialized custody records. Base64
 * originals and chunked plans must never make a privacy assertion vacuous. */
export async function importCopies(db:D1Database){
 const jobs=(await db.prepare('SELECT * FROM ik_jobs').all()).results,plans=[...(await loadPlans(jobs,db)).values()];
 const contents:string[]=[JSON.stringify(plans)];
 for(const plan of plans)for(const artifact of plan.source.artifacts)if(artifact.original?.status==='available')contents.push(Buffer.from(artifact.original.base64,'base64').toString('utf8'));
 const chunks=(await db.prepare('SELECT * FROM ik_d1_original_chunks ORDER BY job_id,kind,original_key,ordinal').all<{job_id:string;kind:string;original_key:string;ordinal:number;bytes:string}>()).results;
 const grouped=new Map<string,string[]>();
 for(const chunk of chunks){const key=JSON.stringify([chunk.job_id,chunk.kind,chunk.original_key]),group=grouped.get(key)??[];group.push(chunk.bytes);grouped.set(key,group);}
 for(const group of grouped.values())contents.push(Buffer.from(group.join(''),'base64').toString('utf8'));
 for(const table of ['crm_import_reviews','crm_import_review_chunks','crm_import_targets','crm_import_stops','crm_import_references','ik_jobs','ik_provenance','ik_d1_history','ik_d1_plan_chunks','ik_d1_creation_plans','ik_originals'])contents.push(JSON.stringify((await db.prepare(`SELECT * FROM ${table}`).all()).results));
 return contents.join('\n');
}

export async function publicArchive(f:Fixture){
 let job=await json(await f.request('records/archive/exports','POST'));
 for(let i=0;i<200&&job.state!=='ready';i++)job=await json(await f.request(`records/archive/exports/${job.id}/advance`,'POST'));
 assert.equal(job.state,'ready');return json(await f.request(`records/archive/exports/${job.id}/download`));
}
