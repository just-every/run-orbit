import type {ActorContext} from '../../shared/expansion-contracts';
import type {AnalyticsMetrics} from './metrics';
import type {SalesDefinition} from './sales-definition';
import type {ViewerAccess} from './sales-access';
import type {SalesRow} from './sales-rows';
import type {SalesPeriod} from './sales-period';
import {aggregate,type Labels,type Section} from './sales-measures';
import {reportOwners,ownerKey} from './record-owners';

/** Only rows naming a readable record enter that record's owner groups. A deal may also name its readable company. */
export async function salesRecordOwners(metrics:AnalyticsMetrics,c:ActorContext,type:'contact'|'company',rows:SalesRow[],access:ViewerAccess){
 const linked=rows.map(row=>{
  const company=row.dealId?access.deals.get(row.dealId)?.values.company_id:null;
  const refs=type==='company'&&typeof company==='string'&&access.records.has(`company:${company}`)&&!row.refs.some(ref=>ref.type==='company'&&ref.id===company)?[...row.refs,{type:'company' as const,id:company}]:row.refs;
  return {...row,refs};
 });
 const refs=[...new Map(linked.flatMap(row=>row.refs.filter(ref=>ref.type===type)).map(ref=>[ownerKey(ref),access.records.get(ownerKey(ref))!.ref])).values()];
 const ownership=await reportOwners(metrics,c,refs),owners=new Map(ownership.items.map(item=>[ownerKey(item),item]));
 return {rows:linked.map(row=>({...row,recordOwners:row.refs.filter(ref=>ref.type===type).map(ref=>owners.get(ownerKey(ref))!)})),proofs:ownership.proofs};
}
export const matchesRecordOwner=(row:SalesRow,ids:string[])=>!ids.length||Boolean(row.recordOwners?.some(owner=>ids.includes(owner.ownerId??'unassigned')));

/** Reuse the measure's actual totals for every owner subgroup: its cells cite the exact same source row keys. */
export function recordOwnerSections(definition:SalesDefinition,period:SalesPeriod,asOf:string,rows:SalesRow[],labels:Labels):Section[]{
 const sections=aggregate(definition,period,asOf,rows,labels);
 if(!definition.recordOwnerType)return sections;
 const ownerIds=[...new Set(rows.flatMap(row=>row.recordOwners?.map(owner=>owner.ownerId??'unassigned')??[]))];
 const groups=new Map(ownerIds.map(id=>[id,aggregate(definition,period,asOf,rows.filter(row=>matchesRecordOwner(row,[id])),labels)]));
 for(const section of sections){
  section.tables.push({key:'record-owner',title:`${definition.recordOwnerType==='contact'?'Contact':'Company'} owner`,groups:ownerIds.map(id=>({key:id,label:id==='unassigned'?'Unassigned':labels.operators?.get(id)??'Former operator',cells:groups.get(id)!.find(item=>item.measure===section.measure)!.totals})).sort((a,b)=>a.label.localeCompare(b.label))});
  section.sources=[...section.sources,'record_ownership.owner_id'];
  section.missing.push(`Owner groups include rows naming a ${definition.recordOwnerType}. A row naming several owners appears once in each matching group; open a figure to inspect its exact rows.`);
 }
 return sections;
}
