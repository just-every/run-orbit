/** A write that did not land, said plainly: the dialog keeps every edit, and Retry tries again. */
export const plainFailure=(error:unknown)=>error instanceof TypeError||error instanceof SyntaxError?'Couldn’t reach Orbit.':error instanceof Error?error.message:String(error);
/** Re-applies only the fields this person changed onto the server's current version. */
export const rebase=<T extends object>(loaded:T,mine:T,fresh:T,keys:(keyof T)[]):T=>({...fresh,...Object.fromEntries(keys.filter(key=>JSON.stringify(mine[key])!==JSON.stringify(loaded[key])).map(key=>[key,mine[key]]))});
export function SaveFailure({message,onRetry}:{message:string;onRetry?:()=>void}){
 return <p role="alert" className="operator-state operator-state--error dash-failure">{message}{onRetry&&<> <button type="button" className="dash-text-button" onClick={onRetry}>Retry</button></>}</p>;
}
