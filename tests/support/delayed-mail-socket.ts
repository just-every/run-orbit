import {createConnection} from 'node:net';

/** Parse a complete HTTP response, keeping response truncation observable. */
function responseMessage(wire:Buffer,bodyless=false){
 const headEnd=wire.indexOf('\r\n\r\n');if(headEnd<0)return;
 const lines=wire.subarray(0,headEnd).toString('latin1').split('\r\n');
 const status=Number(/^HTTP\/1\.[01] (\d{3}) /.exec(lines.shift()!)?.[1]);
 if(!status)throw Error('Invalid HTTP response status');
 if(bodyless)return {status,body:Buffer.alloc(0)};
 const headers=new Map(lines.map(line=>{const i=line.indexOf(':');return [line.slice(0,i).toLowerCase(),line.slice(i+1).trim()];}));
 const body=wire.subarray(headEnd+4);
 if(headers.get('transfer-encoding')==='chunked'){
  let offset=0;const chunks:Buffer[]=[];
  for(;;){
   const lineEnd=body.indexOf('\r\n',offset);if(lineEnd<0)return;
   const sizeText=body.subarray(offset,lineEnd).toString('ascii').split(';')[0];
   if(!/^[0-9a-f]+$/i.test(sizeText))throw Error('Invalid HTTP response chunk');
   const size=Number.parseInt(sizeText,16);offset=lineEnd+2;
   if(size===0){
    if(body.subarray(offset,offset+2).equals(Buffer.from('\r\n')))return {status,body:Buffer.concat(chunks)};
    if(body.indexOf('\r\n\r\n',offset)<0)return;
    return {status,body:Buffer.concat(chunks)};
   }
   if(body.length<offset+size+2)return;
   if(!body.subarray(offset+size,offset+size+2).equals(Buffer.from('\r\n')))throw Error('Invalid HTTP response chunk terminator');
   chunks.push(body.subarray(offset,offset+size));offset+=size+2;
  }
 }
 const length=headers.get('content-length');
 if(length!==undefined&&/^\d+$/.test(length)&&body.length>=Number(length))return {status,body:body.subarray(0,Number(length))};
}

/** Real TCP upload: do not read even response headers until after the native grace. */
export function delayedMailSocket(url:string,identity:string,initial:Uint8Array,readDelay=1500,method:'POST'|'GET'|'HEAD'='POST'){
 return new Promise<{status:number;sent:number;body:Buffer;elapsed:number;readDelay:number}>((resolve,reject)=>{
  const target=new URL(url),began=Date.now(),socket=createConnection({host:target.hostname,port:Number(target.port),allowHalfOpen:true});
  let sent=0,finished=false,wire=Buffer.alloc(0),timer:ReturnType<typeof setInterval>|undefined;
  const tail=Buffer.alloc(65536,120);
  function cleanup(){clearInterval(timer);clearTimeout(resume);clearTimeout(deadline);}
  function fail(error?:{code?:string}){
   if(finished)return;finished=true;cleanup();socket.destroy();
   reject(Error('Delayed TCP response failed '+JSON.stringify({code:error?.code,sent,received:wire.length,elapsed:Date.now()-began})));
  }
  function resumeWhenDue(){const remaining=readDelay-(Date.now()-began);if(remaining>0)resume=setTimeout(resumeWhenDue,remaining);else socket.resume();}
  let resume=setTimeout(resumeWhenDue,readDelay);const deadline=setTimeout(fail,8000);
  socket.pause();
  socket.once('connect',()=>{
   socket.write(`${method} ${target.pathname}${target.search} HTTP/1.1\r\nHost: ${target.host}\r\nCF-Connecting-IP: ${identity}\r\nAccept-Encoding: identity\r\nTransfer-Encoding: chunked\r\nConnection: close\r\n\r\n`);
   const writeChunk=(chunk:Uint8Array)=>{socket.write(Buffer.concat([Buffer.from(chunk.length.toString(16)+'\r\n'),chunk,Buffer.from('\r\n')]));sent+=chunk.length;};
   writeChunk(initial);
   timer=setInterval(()=>{if(!socket.destroyed&&!socket.writableNeedDrain&&sent<initial.length+16*1024*1024)writeChunk(tail);},1);
  });
  socket.on('data',chunk=>{
   if(finished)return;
   if(wire.length+chunk.length>65536){fail();return;}
   wire=Buffer.concat([wire,chunk]);
   let result:ReturnType<typeof responseMessage>;
   try{result=responseMessage(wire,method==='HEAD');}catch{fail();return;}
   if(!result)return;
   finished=true;cleanup();
   const receipt={...result,sent,elapsed:Date.now()-began,readDelay};
   socket.once('close',()=>resolve(receipt));socket.destroy();
  });
  socket.on('error',fail);socket.on('end',()=>{if(!finished)fail();});socket.on('close',()=>{if(!finished)fail();});
 });
}
