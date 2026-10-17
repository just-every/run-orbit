/** Types for the copied Base JavaScript transport; implementation stays in Base Mail. */
declare module '*modules/mail/src/sender.mjs' {
 interface MailMessage {deliveryId:string;from:string;to:string[];subject:string;text?:string;html?:string;messageKey?:string;headers?:Record<string,string>}
 interface MailResult {provider:string;status:'accepted'|'rejected'|'rate_limited'|'uncertain'|'development';providerMessageId:string|null;code?:string}
 export function createMailSender(config:{provider:string;mode:string;apiKey?:string;relayUrl?:string}):{send(message:MailMessage):Promise<MailResult>};
}
declare module '*modules/mail/src/adapters/rer/contract.mjs' {
 export function validateRerConfig(config:{relayUrl?:string}):void;
}
declare module '*modules/mail/src/core/errors.mjs' {
 export class MailValidationError extends Error {code:string}
}
