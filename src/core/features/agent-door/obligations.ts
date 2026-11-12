import {defineTool,ToolRefusal} from '../../../base/modules/agent-door/index.ts';
import {z} from 'zod';
import {acceptObligationInput} from '../obligations/input';
import {acceptObligation} from '../obligations/repository';
import {fullSeller} from './evidence';
import {nativeRecords,outputSchema,standard} from './records';
import {agentDatabase} from './native-access';
import type {PlatformBindings} from '../../platform/assets';
export function obligationTools(bindings:PlatformBindings){return [defineTool({
 name:'orbit.obligations.accept',title:'Accept a meeting follow-up obligation',
 description:'Accept one completed-meeting obligation for a current full operator, citing that meeting, a due time, a later goal stage and explicit stop conditions. No message is approved or sent. Replies leave the advancement goal open.',
 scope:'handoffs:write',readOnly:false,target:args=>({kind:'opportunity',id:String(args.opportunityId)}),inputSchema:{...z.toJSONSchema(acceptObligationInput),type:'object'},outputSchema,classes:['standard'],clauses:['AGENT-003'],
 classify:async(_args,ctx)=>{await fullSeller(bindings,ctx);return standard();},
 summary:args=>({target:{id:String(args.opportunityId)},items:[String(args.title),`Meeting: ${args.meetingId}`,`Recipient: ${args.contactId}`,`Owner: ${args.ownerId}`,`Due: ${args.dueAt}`,`Goal stage: ${args.goalStageId}`,`Stop: ${args.stopCondition}`]}),
 run:async(args,ctx)=>{await fullSeller(bindings,ctx);const parsed=acceptObligationInput.safeParse(args);if(!parsed.success)throw new ToolRefusal('invalid_arguments');
  const {access,actor}=await nativeRecords(bindings,ctx),db=agentDatabase(bindings.DB,access,actor,ctx);
  const result=await acceptObligation(db,parsed.data,ctx.person.id);ctx.emit('obligation.accepted',`orbit://records/opportunity/${parsed.data.opportunityId}`);return {result,resources:[{uri:`orbit://meetings/${parsed.data.meetingId}/plan`,name:'Meeting follow-up plan'}]};},
})];}
