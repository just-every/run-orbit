import {isFullOperator} from '../access/identity-class';
import {BillingError} from './contracts';

export async function billingAuthority(db:D1Database,actor:string,owner=false){
 if(!await isFullOperator(db,actor)||owner&&!await db.prepare("SELECT 1 FROM operators WHERE id=? AND setup_owner=1 AND status='active'").bind(actor).first())throw new BillingError(403,owner?'Only the installation owner can connect Stripe.':'Billing context requires a current full operator.');
}
/** Bind commit authority to the same transaction as the write. */
export function billingAuthorityFence(db:D1Database,actor:string,owner=false){
 const id=crypto.randomUUID();return[db.prepare(`INSERT INTO access_write_guards VALUES(?,CASE WHEN EXISTS(SELECT 1 FROM operators o WHERE o.id=? AND o.status='active' ${owner?'AND o.setup_owner=1':''} AND NOT EXISTS(SELECT 1 FROM access_collaborators c WHERE c.operator_id=o.id)) THEN 1 ELSE 0 END)`).bind(id,actor),db.prepare('DELETE FROM access_write_guards WHERE id=?').bind(id)];
}
