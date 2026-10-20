/** WebCrypto verifies HMAC in constant time; signed freshness never substitutes for one-use IDs. */
export async function verified(secret:string,raw:string,timestamp:string,signature:string){
 if(!/^\d{10}$/.test(timestamp)||!/^v0=[a-f0-9]{64}$/.test(signature))return false;
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 const valid=await crypto.subtle.verify('HMAC',key,Uint8Array.from(signature.slice(3).match(/../g)!,part=>parseInt(part,16)),new TextEncoder().encode(`v0:${timestamp}:${raw}`));
 return valid&&Math.abs(Date.now()-Number(timestamp)*1000)<=300000;
}
