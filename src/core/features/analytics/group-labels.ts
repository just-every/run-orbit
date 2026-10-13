import type {ActorContext,Json,MetricSnapshot,SqlStatement} from '../../shared/expansion-contracts';
import {groupRecordNames} from './group-record-names';
import {AccessError} from '../access/errors';
import {isFullOperator,fullOperatorFence} from '../access/identity-class';
import type {AnalyticsMetrics,MetricDefinition} from './metrics';

/** Resolve record names through current graph authority, never from an unrestricted join. */
export async function labelReportGroups(metrics:AnalyticsMetrics,context:ActorContext,definition:MetricDefinition,snapshot:MetricSnapshot) {
 const proofs:SqlStatement[]=[],groups=snapshot.values.groups;
 if(!Array.isArray(groups))return proofs;
 const {labels,proofs:nameProofs}=await groupRecordNames(metrics,context,definition.groupBy,snapshot);
 proofs.push(...nameProofs);
 snapshot.values.groups=await Promise.all(groups.map(async value=>{
  const row=value as Record<string,Json>,group=row.group;
  let label=group===null?'Not entered':labels.get(String(group))??String(group);
  if(typeof group==='string'&&definition.groupBy==='stage_id'){
   const stage=await metrics.store.db.prepare('SELECT name FROM pipeline_stages WHERE id=?').bind(group).first<{name:string}>();
   if(!stage)throw new AccessError('prerequisite','A report stage name is unavailable.');
   label=stage.name;
   proofs.push(...metrics.store.guard('EXISTS(SELECT 1 FROM pipeline_stages WHERE id=? AND name=?)',[group,label]));
  }else if(typeof group==='string'&&['owner_id','closed_by'].includes(definition.groupBy??'')){
   if(context.principal.kind!=='operator'||!await isFullOperator(metrics.store.db,context.principal.operatorId))throw new AccessError('permission','Operator names require workspace settings access.');
   const owner=await metrics.store.db.prepare('SELECT display_name FROM operators WHERE id=?').bind(group).first<{display_name:string}>();
   if(!owner)throw new AccessError('prerequisite','A report operator name is unavailable.');
   label=owner.display_name;
   proofs.push(...fullOperatorFence(context),...metrics.store.guard('EXISTS(SELECT 1 FROM operators WHERE id=? AND display_name=?)',[group,label]));
  }
  return {...row,label};
 }));
 return proofs;
}
