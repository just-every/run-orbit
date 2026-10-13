import {CaptureProviderError} from '../contracts';
import type {Provider} from './config';

// Structured token endpoint errors only; provider descriptions may contain secrets.
// https://learn.microsoft.com/entra/identity-platform/v2-oauth2-auth-code-flow#error-codes-for-token-endpoint-errors
const configuration=new Set(['invalid_request','unauthorized_client','invalid_client','unsupported_grant_type','invalid_resource','invalid_scope']);
const interactive=new Set(['invalid_grant','interaction_required','consent_required','login_required']);
export function tokenRefusal(provider:Provider,status:number,error:unknown){
 if(status===429||status>=500)return new CaptureProviderError('unavailable','The authorization server is temporarily unavailable.');
 if(typeof error==='string'&&(provider==='microsoft'?configuration.has(error)||interactive.has(error):error==='invalid_grant'||error==='invalid_client')){
  const message=configuration.has(error)?'The authorization configuration was refused. Check the OAuth client settings before reconnecting.':'The saved authorization requires a new sign-in or consent.';
  return new CaptureProviderError('revoked',message,true);
 }
 return new CaptureProviderError('unavailable','The authorization server could not complete the request.');
}
