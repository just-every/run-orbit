import {z} from 'zod';
import {boundedResponse} from '../capture/providers/response';
import {BillingError,type BillingConfig,type CustomerIdentity} from './contracts';

/** Only the customer identity endpoint is read; no payment instrument is requested or persisted. */
export async function stripeRead(config:BillingConfig,apiKey:string,path:string){
 let response:Response;
 try{response=await(config.fetcher??fetch)(`https://api.stripe.com/v1/${path}`,{method:'GET',redirect:'manual',headers:{Authorization:`Bearer ${apiKey}`,'Stripe-Version':'2024-06-20'},signal:AbortSignal.timeout(15000)});}
 catch{throw new BillingError(502,'Stripe could not be reached. Try again after checking the connection.');}
 if(response.status>=300&&response.status<400){await response.body?.cancel();throw new BillingError(502,'Stripe redirected the customer read; the request stopped.');}
 if(!response.ok){await response.body?.cancel();throw new BillingError(response.status===401||response.status===403?409:502,'Stripe refused the customer read. Check the restricted test key and its Customers read permission.');}
 try{return await(await boundedResponse(response,262144)).json() as unknown;}
 catch{throw new BillingError(502,'Stripe returned an unreadable customer response.');}
}
const customerSchema=z.object({id:z.string().min(1).max(200),name:z.string().trim().min(1).max(200),email:z.email().max(320),livemode:z.literal(false),deleted:z.literal(false).optional()});
export async function stripeCustomer(config:BillingConfig,apiKey:string,id:string):Promise<CustomerIdentity>{
 const parsed=customerSchema.safeParse(await stripeRead(config,apiKey,`customers/${encodeURIComponent(id)}`));
 if(!parsed.success||parsed.data.id!==id)throw new BillingError(409,'Choose a test customer with a name and email that match the deal contact and company.');
 const email=parsed.data.email.trim().toLowerCase();return{customerId:id,name:parsed.data.name,email,domain:email.slice(email.lastIndexOf('@')+1)};
}
