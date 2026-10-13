function bytes(value:string) { return new TextEncoder().encode(value); }
function fromHex(value:string) { if(!/^[a-f0-9]{64}$/i.test(value))throw new Error('ORBIT_ENCRYPTION_KEY must be 32 bytes encoded as 64 hexadecimal characters.');return Uint8Array.from(value.match(/../g)!,byte=>parseInt(byte,16)); }
function encode(value:Uint8Array){return btoa(String.fromCharCode(...value));}
function decode(value:string){return Uint8Array.from(atob(value),c=>c.charCodeAt(0));}
export interface SourceSecurity { seal(secret:string):Promise<string>; open(ciphertext:string):Promise<string>; verify(secret:string,body:string,timestamp:string,signature:string,now?:number):Promise<boolean> }
export function createSourceSecurity(env:{ORBIT_ENCRYPTION_KEY?:string}):SourceSecurity|undefined {
  if(!env.ORBIT_ENCRYPTION_KEY)return undefined;
  const raw=fromHex(env.ORBIT_ENCRYPTION_KEY);
  const key=crypto.subtle.importKey('raw',raw,'AES-GCM',false,['encrypt','decrypt']);
  return {
    async seal(secret){const iv=crypto.getRandomValues(new Uint8Array(12));const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv},await key,bytes(secret));return `${encode(iv)}.${encode(new Uint8Array(encrypted))}`;},
    async open(ciphertext){const [iv,data]=ciphertext.split('.');return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(iv!)},await key,decode(data!)));},
    async verify(secret,body,timestamp,signature,now=Date.now()) {
      if(!/^\d{10}$/.test(timestamp)||Math.abs(now-Number(timestamp)*1000)>300000||! /^[a-f0-9]{64}$/i.test(signature))return false;
      const signing=await crypto.subtle.importKey('raw',bytes(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
      return crypto.subtle.verify('HMAC',signing,fromHex(signature),bytes(`${timestamp}.${body}`));
    }
  };
}
export async function payloadHash(raw:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes(raw))),b=>b.toString(16).padStart(2,'0')).join('');}
