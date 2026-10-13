import {claimHostedOwner} from '@runeditrun/rer/internal/cli/deploy-owner.mjs';
import {boundedJSON} from '@runeditrun/rer/modules/deploy-kit/provider';
import {RerError} from '@runeditrun/rer/errors';

/** Keep Base's token custody, but never replay a refused owner mutation. */
export async function claimOrbitOwner(options){
 let refused;
 try{return await claimHostedOwner({...options,fetch:async(input,init)=>{
  const response=await fetch(input,init);
  if(init?.method!=='POST'||response.status===303)return response;
  const body=await boundedJSON(response,8192).catch(()=>null);
  const code=['already_initialized','invalid_setup_token','invalid_configuration'].includes(body?.error)?body.error:'no code';
  if(response.status===409&&code==='already_initialized')return Response.json({error:code},{status:409});
  refused=`HTTP ${response.status} (${code})`;
  throw Error('owner-claim-refused');
 }});}catch(error){
  const reason=refused??(error.message==='owner-claim-failed'?'the hosted owner claim could not be confirmed':'the owner setup token change could not be confirmed');
  throw new RerError('owner_claim_failed',`The application is deployed and healthy at ${options.deployed.origin}, but ${reason}. No owner POST was retried. Keep the deployment receipt and inspect the owner setup before deploying again.`,1);
 }
}
