import type {ImportPlan,SourceRecord} from '../../../modules/import-kit/d1/index';
import {parseCsv} from '../../shared/csv';

/** Rejected rows retain only column positions. Read their labels from the private
 * original at review time, so erasure still withdraws the only personal copy. */
export function contactReviewLabels(plan:ImportPlan){
 const originals=new Map<string,string[][]>();
 return (source:SourceRecord)=>{
  if(source.kind!=='contact')return undefined;
  const payload=source.payload as {data?:Record<string,string>;reviewColumns?:Record<string,number>};
  let data=payload.data;
  if(!data&&payload.reviewColumns){
   const artifact=plan.source.artifacts.find(artifact=>artifact.sha256===source.artifactHash&&artifact.name===source.location.artifact);
   if(artifact?.original?.status==='available'){
    let rows=originals.get(artifact.name);
    if(!rows){rows=parseCsv(Buffer.from(artifact.original.base64,'base64').toString('utf8').replace(/^\uFEFF/,''));originals.set(artifact.name,rows);}
    const values=rows[(source.location.row??0)-1]??[];
    data=Object.fromEntries(Object.entries(payload.reviewColumns).map(([field,column])=>[field,values[column]?.trim()??'']));
   }
  }
  const name=data?.name||[data?.first_name,data?.last_name].filter(Boolean).join(' '),email=data?.email;
  return [name,email&&email!==name?email:undefined].filter(Boolean).join(' · ')||`Contact — row ${source.location.row}`;
 };
}
