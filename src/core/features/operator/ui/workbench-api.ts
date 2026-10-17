export async function workbenchRequest<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/v1/workbench${path}`,{method:body===undefined?'GET':'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const result=await response.json() as T & {error?:string;state?:string};
  if(!response.ok)throw new Error(result.error??`Submission state: ${result.state??'failed'}. Reload to inspect the recorded result.`);
  return result;
}
export interface Inventory { stages:{id:string;name:string;pipelineName?:string}[]; opportunities:{id:string;title:string;score:number;band:string;queueState:string;queueReason:string|null;nextDueAt:string|null}[];mailConfigured:boolean }
