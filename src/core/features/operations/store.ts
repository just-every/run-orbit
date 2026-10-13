import {AccessService} from '../access/service';
import {ScopedMutations} from '../access/mutations';
import {AccessError} from '../access/errors';
import type {ActorContext,DomainEventStatementBuilder,SqlStatement} from '../../shared/expansion-contracts';
export class OperationsStore {
 readonly mutations:ScopedMutations;
 constructor(readonly db:D1Database,readonly access:AccessService,events:DomainEventStatementBuilder){this.mutations=new ScopedMutations(db,access,events);}
 async permit(ctx:ActorContext,operation:string,id='*'){const current=await this.access.refreshContext(ctx);await this.access.authorize(current,operation,{...current,type:'operations',id},[]);return current;}
 async assertCurrent(ctx:ActorContext){await this.mutations.read(ctx,'SELECT 1 AS current');}
 async commit(ctx:ActorContext,operation:string,id:string,revision:number,statements:SqlStatement[],details:unknown={}){return this.mutations.commit(ctx,[...statements,...this.mutations.event(ctx,operation,{...ctx,type:'operations',id},revision,details)]);}
 guard(condition:string,bindings:SqlStatement['bindings']):SqlStatement[]{const id=crypto.randomUUID();return [{sql:`INSERT INTO access_write_guards VALUES(?,CASE WHEN ${condition} THEN 1 ELSE 0 END)`,bindings:[id,...bindings]},{sql:'DELETE FROM access_write_guards WHERE id=?',bindings:[id]}];}

}
export const code=(value:string)=>{if(!/^[a-zA-Z0-9_.:-]{1,120}$/.test(value))throw new AccessError('validation','Use a bounded diagnostic code, never private content.');return value;};
export const integer=(value:number)=>{if(!Number.isSafeInteger(value)||value<0)throw new AccessError('validation','A nonnegative safe integer is required.');return value;};
