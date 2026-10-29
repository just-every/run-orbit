import type {FieldStatus} from './use-autosave';

/** The one line under a field that did not save: why, then Retry (a kept change from an earlier visit also offers
 * Discard); after a teammate's change, who changed it to what, with Use mine. The field keeps the typed value. */
export function SaveFailure({status,onRetry,onDiscard,onUseMine,describe=String}:{status:FieldStatus;onRetry:()=>void;onDiscard:()=>void;onUseMine:()=>void;describe?:(value:unknown)=>string}){
 if(status.state==='failed')return <p className="r-fail" role="alert"><span>{status.message}</span>{status.local?null:<button type="button" className="operator-text-button" onClick={onRetry}>Retry</button>}{status.kept?<button type="button" className="operator-text-button" onClick={onDiscard}>Discard</button>:null}</p>;
 if(status.state==='conflict')return <p className="r-fail r-fail--conflict" role="alert"><span>{status.by??'Someone else'} changed this to {describe(status.theirs)||'nothing'}.</span><button type="button" className="operator-text-button" onClick={onUseMine}>Use mine</button></p>;
 return null;
}
