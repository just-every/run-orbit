import {useEffect,useState} from 'react';
import {recordsRequest} from './records-api';
export function EntryPrivacy({source,id}:{source:'entry'|'task'|'handoff';id:string}){const [data,setData]=useState<{private:boolean;editable:boolean}>(),[error,setError]=useState(''),[busy,setBusy]=useState(false),path=`entries/visibility/${source}/${id}`;
 useEffect(()=>{let live=true;void recordsRequest<{private:boolean;editable:boolean}>(path).then(value=>{if(live)setData(value);}).catch(e=>{if(live)setError(e.message);});return()=>{live=false;};},[path]);
 async function toggle(){setBusy(true);setError('');try{setData(await recordsRequest(path,'PUT',{private:!data!.private}));}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 if(!data)return error?<p role="alert">{error}</p>:null;if(!data.editable)return null;return <div className="workbench-actions"><button type="button" style={{transition:'none'}} disabled={busy} aria-pressed={data.private} onClick={()=>void toggle()}>{data.private?'Private · share with collaborators':'Make entry private'}</button>{error&&<p role="alert">{error}</p>}</div>;
}
