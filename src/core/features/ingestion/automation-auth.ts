/** Keep native automation credentials out of URLs and compare through Web Crypto. */
export async function verifyAutomationSecret(secret:string,authorization:string){
 const match=/^Bearer ([A-Za-z0-9_-]{32,256})$/.exec(authorization);
 if(!match)return false;
 const bytes=new TextEncoder(),algorithm={name:'HMAC',hash:'SHA-256'};
 const candidate=await crypto.subtle.importKey('raw',bytes.encode(match[1]!),algorithm,false,['sign']);
 const expected=await crypto.subtle.importKey('raw',bytes.encode(secret),algorithm,false,['verify']);
 const message=bytes.encode('Orbit source automation authentication');
 return crypto.subtle.verify('HMAC',expected,await crypto.subtle.sign('HMAC',candidate,message),message);
}
