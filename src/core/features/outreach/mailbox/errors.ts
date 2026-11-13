/** Definite provider refusals may be retried; uncertain submissions never are. */
export class MailboxSendError extends Error {
 constructor(message:string,readonly outcome:'failed'|'delivery-unknown'|'deferred',readonly retryAt?:string){super(message);}
}
export function retryAfter(response:Response,now=Date.now()){
 const value=response.headers.get('Retry-After'),seconds=value&&/^\d+$/.test(value)?Number(value):NaN;
 const at=Number.isFinite(seconds)?now+seconds*1000:value?Date.parse(value):NaN;
 return new Date(Number.isFinite(at)&&at>now?at:now+60000).toISOString();
}
