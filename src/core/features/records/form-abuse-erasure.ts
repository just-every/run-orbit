import {identityMatch,identityPatterns} from './erasure-identity';
/** Erase the complete refused original when any field contains an exact mailbox.
 * Native primary addresses and aliases share the same boundary-aware matcher. */
export function formAbuseErasure(db:D1Database,emails:string[]){
 return emails.map(email=>db.prepare(`UPDATE form_spam SET values_json='{}',intake_json='{}',state='erased',receipt_json=NULL WHERE ${identityMatch('values_json')} OR ${identityMatch('intake_json')}`).bind(...identityPatterns(email),...identityPatterns(email)));
}
