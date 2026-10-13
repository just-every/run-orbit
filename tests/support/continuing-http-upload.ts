import {request} from 'node:http';

/** Keep sending after response headers, then read the real response after a delay. */
export function continuingHttpUpload(url:string,headers:Record<string,string>,initial:Uint8Array,readDelay=300){
 return new Promise<{status:number;sent:number;category:string;complete:boolean;uploadError:string|undefined}>((resolve,reject)=>{
  let observedStatus=0,observedComplete=false,receivedBytes=0,uploadError:string|undefined;let incoming:import('node:http').IncomingMessage|undefined;const began=Date.now();
  let sent=0,finished=false,producer:ReturnType<typeof setInterval>|undefined,resume:ReturnType<typeof setTimeout>|undefined;
  const tail=Buffer.alloc(65536,120);
  const cleanup=()=>{clearTimeout(deadline);clearTimeout(resume);clearInterval(producer);};
  const fail=(error?:{code?:string})=>{if(finished)return;finished=true;cleanup();req.destroy();reject(Error('Continuing upload transport failed '+JSON.stringify({code:error?.code,status:observedStatus,complete:observedComplete,receivedBytes,elapsed:Date.now()-began,sent})));};
  const req=request(url,{method:'POST',headers,agent:false},response=>{
   incoming=response;observedStatus=response.statusCode??0;
   const bytes:Buffer[]=[];let received=0;
   response.pause();resume=setTimeout(()=>response.resume(),readDelay);
   response.on('data',(chunk:Buffer)=>{received+=chunk.length;receivedBytes=received;observedComplete=response.complete;if(received<=65536)bytes.push(chunk);});
   response.on('error',fail);
   response.on('end',()=>{
    if(finished)return;finished=true;cleanup();
    const text=Buffer.concat(bytes).toString(),category=text.includes('Network connection lost')?'proxy-network-loss':text.includes('payload limit')?'body-limit':'other';
    const result={status:response.statusCode!,sent,category,complete:response.complete,uploadError};
    if(req.closed)resolve(result);else{req.once('close',()=>resolve(result));req.destroy();}
   });
  });
  const deadline=setTimeout(fail,8000);
  req.on('error',(error:NodeJS.ErrnoException)=>{uploadError=error.code;if(!incoming)fail(error);});req.flushHeaders();
  req.write(initial);sent+=initial.length;
  producer=setInterval(()=>{
   // A finite 16 MiB producer; backpressure bounds the pending local writes.
   if(!req.destroyed&&!req.writableNeedDrain&&sent<initial.length+16*1024*1024){req.write(tail);sent+=tail.length;}
  },1);
 });
}
