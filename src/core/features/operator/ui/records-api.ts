export type RecordKind='contact'|'company'|'opportunity';
export type CustomerRecord={id:string;name?:string;title?:string;[field:string]:any};
export async function recordsRequest<T>(path:string,method='GET',body?:unknown):Promise<T>{// A JSON content type promises a body; bodyless requests (such as DELETE) send none.
 const response=await fetch(`/api/v1/${path}`,{method,credentials:'same-origin',...(body===undefined?{}:{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})});const result=await response.json() as T&{error?:string;recordId?:string};if(!response.ok)throw Object.assign(new Error(`${result.error??'Operation failed.'}${result.recordId?` Existing record: ${result.recordId}`:''}`),{status:response.status});return result;}
