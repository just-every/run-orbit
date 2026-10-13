import assert from 'node:assert/strict';
import {test} from 'node:test';
import {fixture,nativeRecord} from './fixture';
import {AnalyticsMetrics,type MetricDefinition} from '../../src/core/features/analytics/metrics';
import {NativeAnalyticsSources} from '../../src/core/features/analytics/native-sources';
import {OperationsStore} from '../../src/core/features/operations/store';
import {domainEventStatements} from '../../src/core/features/effects/event-statements';

test('a real native insertion after complete report calculation aborts snapshot commit through the population epoch fence',async()=>{
 const f=await fixture();
 try{
  await nativeRecord(f,'contact',{name:'Initial population member',email:'initial@population.test'});
  const store=new OperationsStore(f.db,f.access,domainEventStatements),metrics=new AnalyticsMetrics(store,new NativeAnalyticsSources(f.access));
  const definition:MetricDefinition={name:'Complete current population',description:'Native contact count under a concurrent insertion',aggregation:'count',unit:'contacts',sourceTypes:['contact'],sourceOperation:'graph.read',sourceFields:['created_at'],currency:null,missingPolicy:'incomplete',lateArrival:'recompute',attributionModel:'none',attributionWindowDays:1,dateField:'created_at'};
  await metrics.define(await f.context(),'population-race',1,definition);
  const from=new Date(Date.now()-86400000).toISOString(),through=new Date(Date.now()+86400000).toISOString(),preview=await metrics.preview(await f.context(),'population-race',1,from,through);
  assert.equal(preview.values.value,1);
  const commit=store.commit.bind(store);let inserted=false;
  // The real calculation and prepared guards run first. The independent native
  // write is committed before the original store submits its genuine D1 batch.
  store.commit=async(...args:Parameters<OperationsStore['commit']>)=>{
   if(args[1]==='analytics.snapshot'&&!inserted){inserted=true;await nativeRecord(f,'contact',{name:'Concurrent population member',email:'concurrent@population.test'});}
   return commit(...args);
  };
  await assert.rejects(metrics.compute(await f.context(),'population-race',1,from,through,undefined,preview.reviewHash),/changed/);
  assert.equal(inserted,true);
  assert.equal(await f.db.prepare('SELECT count(*) n FROM contacts').first('n'),2);
  assert.equal(await f.db.prepare('SELECT count(*) n FROM analytics_snapshots').first('n'),0);
  assert.equal(await f.db.prepare('SELECT count(*) n FROM analytics_snapshot_sources').first('n'),0);
  assert.equal(await f.db.prepare("SELECT count(*) n FROM domain_audit WHERE operation='analytics.snapshot'").first('n'),0);
  const fresh=await metrics.preview(await f.context(),'population-race',1,from,through);
  assert.equal(fresh.values.value,2);
  const saved=await metrics.compute(await f.context(),'population-race',1,from,through,undefined,fresh.reviewHash);
  assert.equal((await metrics.read(await f.context(),saved.id)).values.value,2);
 }finally{await f.close();}
});
