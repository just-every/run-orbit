import './library.css';
import {useCallback,useEffect,useState} from 'react';
import type {OperatorDraft} from '../../operator/ui/operator-api';
import type {RenderReview} from '../render';
import {libraryRequest} from './library-api';
export function useRenderedReview(draft:OperatorDraft){
 const [review,setReview]=useState<RenderReview|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const load=useCallback(async()=>{setReview(null);setError('');try{setReview(await libraryRequest<RenderReview>(`/drafts/${draft.id}/render`));}catch(e){setError((e as Error).message);}},[draft.id,draft.revision,draft.updatedAt,draft.isStale]);
 useEffect(()=>{void load();},[load]);
 async function confirm(){if(!review)return;setBusy(true);setError('');try{setReview(await libraryRequest<RenderReview>(`/drafts/${draft.id}/render`,'POST',{revision:review.revision,reviewHash:review.reviewHash}));}catch(e){setError((e as Error).message);await load();}finally{setBusy(false);}}
 return {review,error,busy,confirm,load};
}
export function RenderedMergeFields({state,disabled}:{state:ReturnType<typeof useRenderedReview>;disabled:boolean}){
 const {review,error,busy}=state;
 return <div className="rendered-merge-review">{review?.required&&<><h3>Merge field review</h3><dl className="merge-field-values">{review.fields.map(field=><div key={field.name}><dt>{field.name}</dt><dd>{field.value?.trim()?field.value:'Missing — update the record before approval'}</dd></div>)}</dl>{review.missing.length>0&&<p role="alert">Missing: {review.missing.join(', ')}</p>}{review.stale.map(reason=><p key={reason} role="alert">{reason}</p>)}<p>{review.reviewed?'These merge values match the saved rendered review.':'Review the exact rendered subject, body and opt-out below. A changed merge value requires another review.'}</p><button type="button" disabled={disabled||busy||review.reviewed||review.missing.length>0||review.stale.length>0} onClick={()=>void state.confirm()}>{busy?'Saving review…':review.reviewed?'Merge values reviewed':'Confirm rendered merge values'}</button></>}{error&&<p role="alert">{error}</p>}</div>;
}
