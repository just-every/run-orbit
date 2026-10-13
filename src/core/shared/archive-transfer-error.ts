/** Read only a bounded error envelope. Never surface provider text or credentials. */
export async function archiveTransferError(response:Response):Promise<Error>{
 const fallback=`Archive operation failed (HTTP ${response.status}). Check Records > Archive and Find unfinished exports or restores before resuming. No completion was confirmed.`;
 const reader=response.body?.getReader();if(!reader)return new Error(fallback);
 let text='',bytes=0;const decoder=new TextDecoder('utf-8',{fatal:true});
 try{
  for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>8192)return new Error(fallback);text+=decoder.decode(value,{stream:true});}
  const body=JSON.parse(text+decoder.decode());
  if(response.status===409&&body?.code==='archive_export_active'&&typeof body.archiveJobId==='string'&&/^[0-9A-HJKMNP-TV-Z]{26}$/.test(body.archiveJobId))return new Error(`Archive operation failed (HTTP 409). Export ${body.archiveJobId} retains an immutable snapshot. In Records > Archive, enter this Export transfer ID and choose Resume export to download it. To include later edits, choose Discard export, clear the ID, then Prepare export.`);
  if(response.status===403&&body?.code==='step_up_required')return new Error('Archive operation failed (HTTP 403). Open the email confirmation link in your signed-in browser, then retry within 10 minutes. For terminal transfers, save the current session cookie in your private session file.');
  return new Error(fallback);
 }catch{return new Error(fallback);}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
}
