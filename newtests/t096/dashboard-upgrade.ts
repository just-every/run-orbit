import assert from 'node:assert/strict';
import {exactMainDatabase,dashboardStartingMain} from './main-fixture';
import {createId} from '../../src/core/shared/ids';
import {createApp} from '../../tests/support/app';
import {signIn} from './fixture';
/** The round's actual starting main, including populated REPORT-001 share rows, keeps every original value. */
export async function dashboardStartingUpgrade(){
 const target=await exactMainDatabase(dashboardStartingMain);try{const owner=createId(),stage=createId(),now=new Date().toISOString();await target.db.prepare('INSERT INTO owner_bootstrap VALUES(?,?,?,?,?,?,?,?,?)').bind('initial-owner',owner,'owner@fold.test','Dashboard owner','Existing sales','America/New_York','USD',JSON.stringify([{id:stage,name:'Discovery'}]),now).run();
 const body={kind:'sales',name:'Original saved sales report',description:'Existing source survives upgrade',measures:['pipeline'],pipelineIds:[],repIds:[],groupBy:'pipeline',bucket:'month'};
 await target.db.prepare('INSERT INTO analytics_definitions VALUES(?,?,?,?,?,?)').bind('synthetic-orbit-upgrade','orbit','workspace',1,JSON.stringify(body),now).run();await target.db.prepare('INSERT INTO analytics_report_shares VALUES(?,?,?,?,?,1,?,?)').bind('workspace','synthetic-orbit-upgrade',owner,'workspace','[]',owner,now).run();
 const quote=(name:string)=>'"'+name.replaceAll('"','""')+'"',tables=(await target.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name NOT LIKE 'record_search%' AND name NOT LIKE 'timeline_search%' AND name<>'d1_migrations' ORDER BY name").all<{name:string}>()).results,before=new Map<string,{columns:string[];rows:string}>();
 for(const {name} of tables){const columns=(await target.db.prepare('SELECT name FROM pragma_table_xinfo(?) WHERE hidden<>1 ORDER BY cid').bind(name).all<{name:string}>()).results.map(c=>c.name);before.set(name,{columns,rows:JSON.stringify((await target.db.prepare(`SELECT ${columns.map(quote).join(',')} FROM ${quote(name)}`).all()).results)});}
 await target.migrateFold();for(const {name} of tables){const old=before.get(name)!;assert.equal(JSON.stringify((await target.db.prepare(`SELECT ${old.columns.map(quote).join(',')} FROM ${quote(name)}`).all()).results),old.rows,`${name}: all original rows and columns survive`);}
 const session=await signIn(target.db,'owner@fold.test'),app=createApp({database:target.db,assets:{fetch:async()=>new Response('')}}),response=await app.request('https://orbit.test/api/v2/workspaces/workspace/dashboards',{headers:{Cookie:session.cookie}});assert.equal(response.status,200);assert.deepEqual((await response.json() as any).items,[]);assert.deepEqual((await target.db.prepare('PRAGMA foreign_key_check').all()).results,[]);
 }finally{await target.dispose();}
}
