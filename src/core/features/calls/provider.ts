/** Twilio signs the exact public callback URL followed by sorted form names and values. */
export async function validSignature(token:string,url:string,form:URLSearchParams,signature:string){
 if(!/^[A-Za-z0-9+/]{27}=$/.test(signature))return false;
 const keys=[...new Set(form.keys())].sort();
 if(keys.some(key=>form.getAll(key).length!==1))return false;
 const raw=url+keys.map(key=>key+form.get(key)).join('');
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(token),{name:'HMAC',hash:'SHA-1'},false,['verify']);
 return crypto.subtle.verify('HMAC',key,Uint8Array.from(atob(signature),c=>c.charCodeAt(0)),new TextEncoder().encode(raw));
}
export const phonePattern=/^\+[1-9][0-9]{7,14}$/;
export const normalizedPhone=(value:string)=>value.replace(/[\s().-]/g,'');
