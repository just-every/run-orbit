import type {ResourceDefinition} from '../../../base/modules/agent-door/index.ts';
import {messageMailDatabase} from '../outreach/record-mail-storage';
import {fullSeller} from './evidence';
import {standard} from './records';
import type {PlatformBindings} from '../../platform/assets';

export function outreachResource(bindings:PlatformBindings):ResourceDefinition {
  return {uriTemplate:'orbit://outreach/{id}',name:'Native delivery receipt',scope:'drafts:read',classes:['standard'],classify:standard,
    async read(uri,ctx) {
      try {await fullSeller(bindings,ctx);const id=/^orbit:\/\/outreach\/([^/?#]+)$/.exec(uri)?.[1];if(!id)return null;
        const db=await messageMailDatabase(bindings.DB,id);
        // Receipt metadata never substitutes for an authorized saved-content read.
        const message=await db.prepare('SELECT id,draft_id,revision,recipient_email,state,provider_message_id,scheduled_at,updated_at FROM outbound_messages WHERE id=?').bind(id).first();
        return message?{json:message,untrusted:true}:null;
      }catch{return null;}
    }};
}
