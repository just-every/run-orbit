import {ToolRefusal,type ToolDefinition} from '../../../base/modules/agent-door/index.ts';
import {AccessError} from '../access/errors';
import {RecordError} from '../records/shared';
import {DelegationError} from '../delegation/protocol';
import {DraftRevisionConflict} from '../drafts/service';

/** Native refusal semantics survive the shared transport; restricted and absent
 * records have the same public shape. Unknown failures remain failures. */
function refusal(error:unknown):never {
  if(error instanceof AccessError)throw new ToolRefusal(error.code==='permission'?'resource_unavailable':error.code==='conflict'?'revision_conflict':error.code==='validation'?'invalid_arguments':'native_unavailable');
  if(error instanceof RecordError)throw new ToolRefusal([403,404].includes(error.status)?'resource_unavailable':error.status===409?'revision_conflict':'invalid_arguments');
  if(error instanceof DelegationError)throw new ToolRefusal(({NOT_FOUND:'resource_unavailable',SCOPE_DENIED:'resource_unavailable',DELEGATION_INVALID:'unauthenticated',REVISION_CONFLICT:'revision_conflict',AUDIENCE_CHANGED:'audience_changed',OPERATION_CONFLICT:'idempotency_conflict'} as Record<string,string>)[error.code]??error.code.toLowerCase());
  if(error instanceof DraftRevisionConflict)throw new ToolRefusal('revision_conflict');
  throw error;
}
export function nativeTool(tool:ToolDefinition):ToolDefinition {
  const wrap = <A extends unknown[],R>(fn:(...args:A)=>R|Promise<R>) => async(...args:A):Promise<R>=>{try{return await fn(...args);}catch(error){return refusal(error);}};
  return {...tool,classify:wrap(tool.classify),run:wrap(tool.run),...(tool.revision?{revision:wrap(tool.revision)}:{}),...(tool.summary?{summary:wrap(tool.summary)}:{}),...(typeof tool.authority==='function'?{authority:wrap(tool.authority)}:{}),...(tool.target?{target:wrap(tool.target)}:{})};
}
