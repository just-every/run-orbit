import {AccessError} from '../access/errors';
import type {Publication} from './service';

/** A saved publication state is history; the public target still has to admit this version. */
export async function publicationUnavailableReason(operation:Publication,savedRevision:number,requiresAuthorization:boolean,readPublic:()=>Promise<Publication>):Promise<string|null>{
 if(operation.state!=='published')return null;
 if(savedRevision!==operation.form_revision)return 'The saved form changed. Compile and publish its current revision to open this path.';
 if(requiresAuthorization)return 'This page needs a new capture authorization. Review the contact limit and expiry below.';
 try{
  const current=await readPublic();
  return current.id===operation.id?null:'A newer publication uses this path. Reopen its latest version.';
 }catch(error){
  if(error instanceof AccessError&&error.code==='permission')return 'This page is unavailable. Review its source and publish it again before sharing this path.';
  throw error;
 }
}
