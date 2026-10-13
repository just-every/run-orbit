import type {ActorContext,RecordProjection} from '../../shared/expansion-contracts';
import {baseGraphReadPolicy} from './base-query-policy';
import {AccessService} from './service';
export async function graphReadPolicy(access:AccessService,c:ActorContext){const policy=await baseGraphReadPolicy(access,c);return{...policy,pageLimit:(limit:number)=>limit,filter:async(records:RecordProjection[],_fields:readonly string[])=>records,admit:async(records:RecordProjection[])=>records};}
