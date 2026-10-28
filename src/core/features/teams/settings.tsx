import {useEffect,useState} from 'react';
import {recordsRequest} from '../operator/ui/records-api';
import {OperatorState} from '../operator/ui/operator-shell';
import {RoleEditor} from './role-editor';
import {TeamEditor} from './team-editor';
import {ShareEditor} from './share-editor';
import {RecordPrivacy} from './record-privacy';
import {FieldGrants} from './fields';
import type {RecordShare,TeamSettings} from './contracts';
import './settings.css';
/** A self-contained section for the native Settings page. */
export function SalesTeamSettings(){
 const [data,setData]=useState<TeamSettings>(),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[allowed,setAllowed]=useState(true),[name,setName]=useState('');
 async function load(){try{setData(await recordsRequest<TeamSettings>('settings/teams'));setError('');}catch(e){if((e as any).status===403)setAllowed(false);else setError((e as Error).message);}}
 useEffect(()=>{void load();},[]);
 async function mutate(path:string,method:string,body?:unknown){
  if(busy)return false;setBusy(true);setError('');setNotice('Saving…');
  try{await recordsRequest('settings/teams'+path,method,body);setNotice('Saved');await load();return true;}
  catch(e){setNotice('');setError((e as Error).message);return false;}
  finally{setBusy(false);}
 }
 function editShare(share:RecordShare,patch:Partial<RecordShare>){if(!data)return;const next={...share,...patch};setData({...data,shares:data.shares.map(s=>s.id===share.id?next:s)});const {kind,recordId,subjectKind,subjectId,fields,canEdit}=next;void mutate('/shares/'+share.id,'PUT',{kind,recordId,subjectKind,subjectId,fields,canEdit});}
 if(!allowed)return null;
 return <section className="operator-surface workbench-form sales-teams" aria-labelledby="sales-teams-title"><h2 id="sales-teams-title">Sales roles and teams</h2>
  {error&&<OperatorState kind="error">{error} {!data&&<button type="button" onClick={()=>void load()}>Retry</button>}</OperatorState>}<p role="status" aria-live="polite">{notice}</p>
  {!data&&!error&&<OperatorState>Loading sales access…</OperatorState>}
  {data&&<fieldset disabled={busy} className="sales-teams__form"><h3>Sales roles</h3>{data.members.map(member=><RoleEditor key={member.id} member={member} change={profile=>{setData({...data,members:data.members.map(m=>m.id===member.id?{...m,profile}:m)});void mutate('/roles/'+member.id,'PUT',profile);}}/>)}
   <h3>Teams</h3>{data.teams.map(team=><TeamEditor key={team.id} team={team} members={data.members} dashboards={data.dashboards} change={(next,save)=>{setData({...data,teams:data.teams.map(t=>t.id===team.id?next:t)});if(save){const {name,active,defaultDashboardId}=next;void mutate('/'+team.id,'PUT',{name,active,defaultDashboardId});}}} membership={operatorIds=>{setData({...data,teams:data.teams.map(t=>t.id===team.id?{...t,memberIds:operatorIds}:t)});void mutate('/'+team.id+'/members','PUT',{operatorIds});}}/>)}
   <details className="sales-teams__item" open={!data.teams.length}><summary>Add a team</summary><form className="workbench-form" onSubmit={e=>{e.preventDefault();void mutate('','POST',{name,active:true,defaultDashboardId:null}).then(ok=>{if(ok)setName('');});}}><label>Team name<input required maxLength={120} value={name} onChange={e=>setName(e.target.value)}/></label><button className="operator-button">Add team</button></form></details>
   <h3>Record privacy</h3><RecordPrivacy busy={busy} change={(kind,id,visibility)=>mutate('/records/'+kind+'/'+id+'/visibility','PUT',{visibility})}/><h3>Record shares</h3>{data.shares.map(share=><details className="sales-teams__item" key={share.id}><summary>{share.name}<span>{share.subjectName}</span></summary><FieldGrants value={share.fields} onChange={fields=>editShare(share,{fields})}/><label><input type="checkbox" checked={share.canEdit} onChange={e=>editShare(share,{canEdit:e.target.checked})}/>Allow editing within role permissions</label><button type="button" onClick={()=>void mutate('/shares/'+share.id,'DELETE')}>Revoke share</button></details>)}
   <ShareEditor data={data} busy={busy} create={input=>mutate('/shares','POST',input)}/>
  </fieldset>}
 </section>;
}
