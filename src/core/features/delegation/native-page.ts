import type {Context} from 'hono';
import type {ContentfulStatusCode} from 'hono/utils/http-status';
export const escapeHtml=(value:unknown)=>String(value).replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]!));
export function nativePage(title:string,body:string){return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)} · Orbit</title><link rel="stylesheet" href="/operator-native.css"></head><body><a class="skip-link" href="#content">Skip to content</a><header><a class="mark" href="/" data-rer-name>Orbit</a><a href="/app/settings#access">Settings · Access</a></header><main id="content" tabindex="-1"><h1>${escapeHtml(title)}</h1>${body}</main></body></html>`;}
export function nativeList(value:string){const values=JSON.parse(value) as unknown[];return values.length?`<ul>${values.map(item=>`<li>${escapeHtml(item)}</li>`).join('')}</ul>`:'<p>None</p>';}

export function nativeError(context:Context,code:string,status:ContentfulStatusCode){
 return context.req.header('Accept')?.includes('text/html')
  ? context.html(nativePage('Request could not be completed',`<p role="alert">${escapeHtml(code.replaceAll('_',' ').toLowerCase())}. No successful change was confirmed.</p><a href="/delegation/settings">Return to connected applications</a>`),status)
  : context.json({error:{code,message:code}},status);
}
