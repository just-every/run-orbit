function decode(value:string){return Uint8Array.from(atob(value.replace(/-----[^-]+-----/g,'').replace(/\s/g,'')),c=>c.charCodeAt(0));}
function rawSignature(der:Uint8Array){
 if(der[0]!==48||der[1]!==der.length-2||der[2]!==2)throw new Error('Invalid ECDSA signature encoding.');
 const rLength=der[3]!,sTag=4+rLength;if(der[sTag]!==2)throw new Error('Invalid ECDSA signature encoding.');
 const sLength=der[sTag+1]!;if(sTag+2+sLength!==der.length)throw new Error('Invalid ECDSA signature length.');
 const raw=new Uint8Array(64);for(const [value,offset] of [[der.slice(4,4+rLength),0],[der.slice(sTag+2),32]] as const){const integer=value.length===33&&value[0]===0?value.slice(1):value;if(integer.length>32)throw new Error('Invalid ECDSA integer.');raw.set(integer,offset+32-integer.length);}return raw;
}
export async function verifyMailWebhook(publicKey:string,body:ArrayBuffer,timestamp:string,signature:string,now=Date.now()){
 if(!/^\d{10}$/.test(timestamp)||Math.abs(now-Number(timestamp)*1000)>300000)return false;
 try {const key=await crypto.subtle.importKey('spki',decode(publicKey),{name:'ECDSA',namedCurve:'P-256'},false,['verify']);const prefix=new TextEncoder().encode(timestamp),payload=new Uint8Array(prefix.length+body.byteLength);payload.set(prefix);payload.set(new Uint8Array(body),prefix.length);return crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},key,rawSignature(decode(signature)),payload);}catch{return false;}
}
