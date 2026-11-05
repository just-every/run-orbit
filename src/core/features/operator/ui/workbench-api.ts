export class WorkbenchApiError extends Error {
  constructor(message: string, readonly status: number, readonly state?: string, readonly retryAfter?: string | null) {
    super(message);
    this.name = 'WorkbenchApiError';
  }
}

export async function workbenchRequest<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/v1/workbench${path}`,{method:body===undefined?'GET':'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const result=await response.json() as T & {error?:string;state?:string;retryAfter?:string|null};
  if(!response.ok)throw new WorkbenchApiError(result.error??`Submission state: ${result.state??'failed'}. Reload to inspect the recorded result.`,response.status,result.state,result.retryAfter);
  return result;
}
export interface Inventory { companies:{id:string;name:string}[]; contacts:{id:string;name?:string;email?:string|null;companyId?:string|null}[]; stages:{id:string;name:string;pipelineName?:string}[]; opportunities:{id:string;title:string;score:number;band:string;queueState:string;queueReason:string|null;nextDueAt:string|null}[];mailConfigured:boolean }
