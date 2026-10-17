import type { MailSender } from '@runeditrun/rer/modules/operator-auth';
import {sendSendGrid,SendGridSendError} from '../../../base/modules/mail/src/sendgrid-email/index.mjs';
import { createMailSender } from '../../../base/modules/mail/src/sender.mjs';
import { sendDevelopment } from '../../../base/modules/mail/src/development/index.mjs';
import type { PlatformBindings } from '../../platform/assets';

/** Local sign-in mail is suppressed; hosted mail uses the explicitly selected transport. */
export function identityMailSender(bindings: PlatformBindings): MailSender | undefined {
  if (bindings.AUTH_LOCAL === 'true' || bindings.RER_DEMO === '1') {
    if (bindings.MAIL_PROVIDER !== 'development' || !bindings.MAIL_FROM) return undefined;
    return { async send(message) {
      return sendDevelopment({ provider: 'development', mode: 'development' }, message);
    } };
  }
  // Existing installations supplied SENDGRID_API_KEY before MAIL_PROVIDER was declared.
  const provider = bindings.MAIL_PROVIDER?.trim() || 'sendgrid';
  if (provider !== 'rer' && provider !== 'sendgrid') throw new Error('Sign-in MAIL_PROVIDER must be rer or sendgrid.');
  const apiKey = provider === 'rer' ? bindings.MAIL_API_KEY : bindings.MAIL_API_KEY?.trim() || bindings.SENDGRID_API_KEY;
  const credentialName = provider === 'rer' || bindings.MAIL_API_KEY?.trim() ? 'MAIL_API_KEY' : 'SENDGRID_API_KEY';
  const settings:Record<string,string|undefined> = { MAIL_FROM: bindings.MAIL_FROM, [credentialName]: apiKey,
    ...(provider === 'rer' ? { MAIL_RELAY_URL: bindings.MAIL_RELAY_URL } : {}) };
  const missing = Object.keys(settings).filter(name => !settings[name]?.trim());
  if (missing.length === Object.keys(settings).length) return undefined;
  if (missing.length) throw new Error(`Sign-in mail requires ${missing.join(', ')}.`);
  if(provider==='sendgrid')return {async send(message){
    try{const sent=await sendSendGrid({apiKey:apiKey!,message:{...message,from:bindings.MAIL_FROM!}});return {status:'accepted',provider:sent.provider,providerMessageId:sent.providerMessageId};}
    catch(error){if(!(error instanceof SendGridSendError))throw error;return {status:error.outcome==='ambiguous'?'uncertain':error.outcome,provider:'sendgrid',providerMessageId:null};}
  }};
  const sender = createMailSender({ provider, mode: 'production', apiKey,
    ...(provider === 'rer' ? { relayUrl: bindings.MAIL_RELAY_URL } : {}) });
  return { async send(message) {
    return sender.send({ ...message, from: bindings.MAIL_FROM! });
  } };
}
