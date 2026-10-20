import type {LibraryEntry} from '../library-repository';
export interface LibraryState {entries:LibraryEntry[];admin:boolean;actorId:string;fields:string[]}
export async function libraryRequest<T>(path='',method='GET',data?:unknown):Promise<T>{const response=await fetch('/api/v1/library'+path,{method,headers:{'content-type':'application/json'},...(data===undefined?{}:{body:JSON.stringify(data)})});const result=await response.json() as {error?:string};if(!response.ok)throw new Error(result.error??'Library request failed.');return result as T;}
