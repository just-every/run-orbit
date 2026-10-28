/** RFC 1321 MD5, used only for Mailchimp's subscriber hash: the member ID Mailchimp derives from the lower-cased email. */
const shifts=[7,12,17,22,5,9,14,20,4,11,16,23,6,10,15,21],constants=Array.from({length:64},(_,i)=>Math.floor(Math.abs(Math.sin(i+1))*2**32)>>>0);
export function md5(text:string){
 const data=new TextEncoder().encode(text),length=((data.length+8>>>6)+1)*64,bytes=new Uint8Array(length),view=new DataView(bytes.buffer),bits=data.length*8;
 bytes.set(data);bytes[data.length]=0x80;view.setUint32(length-8,bits>>>0,true);view.setUint32(length-4,Math.floor(bits/2**32),true);
 const state=[0x67452301,0xefcdab89,0x98badcfe,0x10325476];
 for(let offset=0;offset<length;offset+=64){
  let [a,b,c,d]=state as [number,number,number,number];
  for(let i=0;i<64;i++){
   const round=i>>4,f=round===0?(b&c)|(~b&d):round===1?(d&b)|(~d&c):round===2?b^c^d:c^(b|~d),g=round===0?i:round===1?(5*i+1)%16:round===2?(3*i+5)%16:(7*i)%16;
   const sum=(a+f+constants[i]!+view.getUint32(offset+g*4,true))>>>0,shift=shifts[round*4+i%4]!;
   a=d;d=c;c=b;b=(b+((sum<<shift)|(sum>>>(32-shift))))>>>0;
  }
  state[0]=(state[0]!+a)>>>0;state[1]=(state[1]!+b)>>>0;state[2]=(state[2]!+c)>>>0;state[3]=(state[3]!+d)>>>0;
 }
 return state.map(word=>Array.from({length:4},(_,i)=>((word>>>(i*8))&255).toString(16).padStart(2,'0')).join('')).join('');
}
