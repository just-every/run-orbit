import { z } from 'zod';
export const outputSchema=z.object({explanation:z.string().min(1).max(4000),subject:z.string().max(998),body:z.string().max(10000),evidenceIds:z.array(z.string()).min(1)}).strict();
export type AIOutput=z.infer<typeof outputSchema>;
export interface OutputFormat {name:string;schema:z.ZodType}
export interface AIProvider {
 model:string; provider:string; inputCostPerMillion:number; outputCostPerMillion:number; cachedInputCostPerMillion?:number;
 /** Generates structured output for an exact request; `format` names the operation's own schema (the draft schema by default). */
 generate(preview:unknown,format?:OutputFormat):Promise<{output:unknown;inputTokens:number;outputTokens:number;cachedInputTokens?:number}>;
}
export interface AIBindings { OPENAI_API_KEY?:string; AI_MODEL?:string; AI_INPUT_COST_PER_MILLION?:string; AI_OUTPUT_COST_PER_MILLION?:string; AI_CACHED_INPUT_COST_PER_MILLION?:string }
export function createAIProvider(env:AIBindings):AIProvider|undefined {
 if(!env.OPENAI_API_KEY)return undefined;
 if(!env.AI_MODEL)throw new Error('AI_MODEL is required with OPENAI_API_KEY.');
 const inputCost=Number(env.AI_INPUT_COST_PER_MILLION),outputCost=Number(env.AI_OUTPUT_COST_PER_MILLION);
 if(!Number.isFinite(inputCost)||inputCost<0)throw new Error('AI_INPUT_COST_PER_MILLION is required.');
 if(!Number.isFinite(outputCost)||outputCost<0)throw new Error('AI_OUTPUT_COST_PER_MILLION is required.');
 const cachedCost=env.AI_CACHED_INPUT_COST_PER_MILLION===undefined?undefined:Number(env.AI_CACHED_INPUT_COST_PER_MILLION);
 if(cachedCost!==undefined&&(!Number.isFinite(cachedCost)||cachedCost<0))throw new Error('AI_CACHED_INPUT_COST_PER_MILLION must be a nonnegative rate.');
 return {provider:'openai',model:env.AI_MODEL,inputCostPerMillion:inputCost,outputCostPerMillion:outputCost,cachedInputCostPerMillion:cachedCost,
  async generate(preview,format={name:'orbit_assistance',schema:outputSchema}) {
   const deadline=Date.now()+30000;
   for(let attempt=0;attempt<3;attempt++) {
    let response:Response;
    try { response=await fetch('https://api.openai.com/v1/responses',{method:'POST',redirect:'manual',headers:{Authorization:`Bearer ${env.OPENAI_API_KEY}`,'Content-Type':'application/json'},signal:AbortSignal.timeout(Math.max(1,deadline-Date.now())),body:JSON.stringify({model:env.AI_MODEL,reasoning:{effort:"low"},store:false,input:JSON.stringify(preview),text:{format:{type:'json_schema',name:format.name,strict:true,schema:z.toJSONSchema(format.schema)}}})}); }
    catch {if(attempt<2&&Date.now()<deadline)continue;throw new Error('AI transport failed. No content was created.');}
    if((response.status===429||response.status>=500)&&attempt<2&&Date.now()<deadline)continue;
    if(!response.ok)throw new Error(`AI provider rejected the request (HTTP ${response.status}).`);
    const data=await response.json() as {status?:string;output?:{content?:{type:string;text?:string}[]}[];usage?:{input_tokens:number;output_tokens:number;input_tokens_details?:{cached_tokens?:number}}};
    if(data.status!=='completed')throw new Error('AI response did not complete.');
    const text=data.output?.flatMap(item=>item.content??[]).filter(item=>item.type==='output_text').map(item=>item.text??'').join('');
    if(!text||!data.usage)throw new Error('AI returned no validated content or usage.');
    const usage=data.usage,cached=usage.input_tokens_details?.cached_tokens??0;
    if(![usage.input_tokens,usage.output_tokens,cached].every(value=>Number.isSafeInteger(value)&&value>=0)||cached>usage.input_tokens)throw new Error('AI returned invalid token accounting.');
    return {output:format.schema.parse(JSON.parse(text)),inputTokens:data.usage.input_tokens,outputTokens:data.usage.output_tokens,cachedInputTokens:data.usage.input_tokens_details?.cached_tokens??0};
   }
   throw new Error('AI transport failed.');
  }
 };
}
