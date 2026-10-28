import {canonicalJson,sha256,type SourceRecord,type MappingResult} from '../../../modules/import-kit/d1/index';
/** Ownership is an independently reversible and erasable native target. Give it
 * its own normalized source identity, while retaining the exact CSV location. */
export function separateOwnerSources(records:SourceRecord[],results:Map<SourceRecord,MappingResult>){
 const owners:SourceRecord[]=[];
 for(const record of records){
  const mapped=results.get(record);if(!mapped)continue;
  const effects=mapped.effects.filter(effect=>effect.targetKind==='owner');if(!effects.length)continue;
  mapped.effects=mapped.effects.filter(effect=>effect.targetKind!=='owner');
  const payload={recordKind:record.kind,sourceId:record.sourceId,owner:(record.payload as any).ownerReview};
  const source:SourceRecord={...record,kind:'ownership',sourceId:`${record.kind}:${record.sourceId}`,payload,payloadHash:sha256(canonicalJson(payload))};
  owners.push(source);results.set(source,{effects});
 }
 return owners;
}
export const sourceLocationKey=(record:SourceRecord)=>canonicalJson([record.kind,record.sourceId,record.location]);
