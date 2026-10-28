import type { PlatformBindings } from '../../platform/assets';
import { orbitAgentDoor } from './index';
import type { AgentDoor } from '../../../base/modules/agent-door/types.ts';
/** Scheduled agent work is re-admitted through its typed final-action tool.
 * Ordinary request timers skip agent-owned messages, including after Pause. */
export async function dispatchAgentWork(bindings:PlatformBindings){
 const rows=(await bindings.DB.prepare("SELECT w.message_id,w.principal,m.attempt_count FROM orbit_agent_work w JOIN outbound_messages m ON m.id=w.message_id WHERE m.state='scheduled' AND COALESCE(m.next_attempt_at,m.scheduled_at)<=strftime('%Y-%m-%dT%H:%M:%fZ','now') ORDER BY m.scheduled_at LIMIT 50").all<{message_id:string;principal:string;attempt_count:number}>()).results;
 const door=orbitAgentDoor(bindings);
 for(const row of rows){const principal=JSON.parse(row.principal) as Parameters<AgentDoor['invoke']>[2];await door.invoke('orbit.outreach.dispatch',{id:row.message_id,idempotency_key:`dispatch:${row.message_id}:${row.attempt_count}`},principal);}
}
