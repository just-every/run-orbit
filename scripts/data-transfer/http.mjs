import {archiveTransferError} from '../../src/core/shared/archive-transfer-error.ts';
/** One authenticated operation. Ambiguous writes are reconciled by transfer status, never retried here. */
export function transferClient(origin,cookie,fetcher=fetch){
  return async function request(path,{method='GET',body,signal,raw=false}={}){
    if(!path.startsWith('/api/v1/records/')||path.includes('..'))throw new Error('Invalid archive endpoint.');
    const response=await fetcher(new URL(path,origin),{method,redirect:'error',signal,
      headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},
      ...(body===undefined?{}:{body:typeof body==='string'?body:JSON.stringify(body)})});
    if(!response.ok)throw await archiveTransferError(response);
    if(raw)return response;
    const reader=response.body?.getReader();if(!reader)throw new Error('Archive status response was empty.');
    const decoder=new TextDecoder('utf-8',{fatal:true});let text='',bytes=0;
    try{
      for(;;){const {value,done}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>1_048_576)throw new Error('Archive status response exceeded its bounded size.');text+=decoder.decode(value,{stream:true});}
      return JSON.parse(text+decoder.decode());
    }catch(error){await reader.cancel();throw error;}finally{reader.releaseLock();}
  };
}
