import {version} from './store';

/** The reserved local seller stays out of choices until a real sign-in proves it.
 * Ordinary invited operators remain visible before their first sign-in.
 */
export function operatorListingPredicate(operator: string) {
 return `(lower(${operator}.email)<>'seller@dev.localhost' OR EXISTS(
  SELECT 1 FROM sessions listing_session
  LEFT JOIN identity_sessions listing_identity ON listing_identity.session_id=listing_session.id
  WHERE listing_session.operator_id=${operator}.id
   AND listing_session.revoked_at IS NULL
   AND listing_session.expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now')
   AND listing_identity.kind IS NOT 'dev'
   AND (listing_identity.kind IS NULL OR listing_identity.authority_version=${version(operator)})
 ))`;
}
