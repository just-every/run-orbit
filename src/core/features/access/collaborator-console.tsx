import {useEffect,useRef,useState} from 'react';
import {api} from '../fold-ui/workspace';
import {CollaboratorGrants} from './collaborator-grants';
import {CreatedInvitationPanel,type CreatedInvitation} from './collaborator-invite';
const profiles=[{value:'guest',name:'Guest',meaning:'sees only the records you share with them'},{value:'analyst',name:'Analyst',meaning:'reads every record and saves reports'},{value:'seller',name:'Seller',meaning:'reads and edits every record'}];
const profileName=(role:string)=>profiles.find(p=>p.value===role)?.name??role;
export function CollaboratorConsole({workspaceId}:{workspaceId:string}){
 const base=`/api/v2/access/workspaces/${encodeURIComponent(workspaceId)}`,[self,setSelf]=useState<any>(null),[data,setData]=useState<any>(null),[error,setError]=useState(''),[status,setStatus]=useState(''),[invitation,setInvitation]=useState<CreatedInvitation|null>(null),[busy,setBusy]=useState(false),feedback=useRef<HTMLParagraphElement>(null);
 // A read fenced by the authority epoch it started under is refused when a profile change
 // commits during it. That refusal describes a superseded view, so read the current one again.
 async function refresh(attempt=0):Promise<void>{try{const current=await api<{access_class:string;role:string}>(`${base}/self`);setSelf(current.access_class==='collaborator'?{...current,reports:(await api<{reports:boolean}>('/api/v2/access/class')).reports}:current);if(current.access_class==='native_full')setData(await api(`${base}/administration`));}catch(error){if(attempt<2&&error instanceof Error&&error.message==='Authority changed before the read.')return refresh(attempt+1);throw error;}}useEffect(()=>{refresh().catch(e=>setError(e.message));},[base]);
 async function act(work:()=>Promise<void>){setBusy(true);setError('');try{await work();await refresh();}catch(e){setError(e instanceof Error?e.message:'Access change was not confirmed.');}finally{setBusy(false);setTimeout(()=>feedback.current?.focus(),0);}}
 if(self?.access_class==='collaborator')return <section className="fold-panel"><h2>Your collaborator access</h2><p>You are a {profileName(self.role)}. The workspace owner chooses which records and fields you can use.</p><a href="/app/shared-records">Open shared records</a>{self.reports?<p><a href="/app/reports">Open reports</a></p>:null}</section>;
 const pending=(data?.invitations??[]).filter((i:any)=>!i.accepted_by&&!i.revoked_at&&Date.parse(i.expires_at)>Date.now());
 return <><section className="fold-panel"><h2>Collaborators</h2>
  <p>Invite someone outside your team, such as an accountant or a partner, with their own email address. You choose what each one can see and change. Your teammates keep full access.</p>
  <p ref={feedback} tabIndex={-1} role={error?'alert':'status'}>{error||status}</p>
  <form onSubmit={event=>{event.preventDefault();const form=new FormData(event.currentTarget),email=String(form.get('email')).trim().toLowerCase(),role=String(form.get('role'));void act(async()=>{const result=await api<{token:string;expiresAt:string;local:boolean}>(`${base}/invitations`,{email,role,expiresAt:new Date(Date.now()+7*86400000).toISOString()});setInvitation({email,role,token:result.token,expiresAt:result.expiresAt,local:result.local});setStatus(`Invitation created for ${email}. Send them the link below.`);});}}>
   <div className="fold-grid"><label>Collaborator email<input type="email" name="email" required/></label><label>Starts as<select name="role" aria-describedby="collaborator-profiles">{profiles.map(p=><option key={p.value} value={p.value}>{p.name}</option>)}</select></label></div>
   <p id="collaborator-profiles" className="fold-hint">{profiles.map(p=>`${p.name} ${p.meaning}.`).join(' ')} You can change this later.</p>
   <button disabled={busy}>Create invitation</button>
  </form>
  {invitation&&<CreatedInvitationPanel invitation={invitation}/>}
  {pending.map((i:any)=><div className="fold-row" key={i.id}><p>{i.email} · invited as {profileName(i.role)} · waiting for them to open their link</p></div>)}
  {data?.members.map((member:any)=><div className="fold-row" key={member.operator_id}><h3>{member.display_name}</h3><p>{member.email} · {member.access_class==='native_full'?'Teammate with full access':`${profileName(member.role)} collaborator`} · {member.status}</p>{member.access_class==='collaborator'&&member.status==='active'&&<><label>Collaborator profile<select aria-label={`Profile for ${member.email}`} disabled={busy} value={member.role} onChange={event=>void act(async()=>{await api(`${base}/members/${member.operator_id}`,{role:event.target.value,status:'active'},'PUT');setStatus('Collaborator profile updated.');})}>{profiles.map(p=><option key={p.value} value={p.value}>{p.name}</option>)}</select></label><button disabled={busy} onClick={()=>void act(async()=>{await api(`${base}/members/${member.operator_id}`,{role:member.role,status:'removed'},'PUT');setStatus('Collaborator removed; sessions, invitations and grants revoked.');})}>Remove collaborator</button></>}</div>)}
 </section>
 {data&&<CollaboratorGrants base={base} workspaceId={workspaceId} members={data.members} grants={data.grants} busy={busy} act={act} setStatus={setStatus}/>}</>;
}
