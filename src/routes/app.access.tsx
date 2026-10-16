import { editorLeaf } from "../editor/leaf";
import {AccessNavigation} from '../core/features/operator/ui/access-navigation';
import {useEffect,useRef,useState} from 'react';
import {createFileRoute,useNavigate} from '@tanstack/react-router';
import {FoldWorkspace,FoldShell,api} from '../core/features/fold-ui/workspace';
import {CollaboratorConsole} from '../core/features/access/collaborator-console';
export const Route=createFileRoute('/app/access')({component:editorLeaf(AccessPage)});
function AccessPage(){const[accepted,setAccepted]=useState(false);return <FoldShell title="Collaborators"><AccessNavigation/><InvitationAcceptance onAccepted={()=>setAccepted(true)}/><FoldWorkspace key={String(accepted)} embedded title="Manage collaborator access">{workspace=><CollaboratorConsole workspaceId={workspace}/>}</FoldWorkspace></FoldShell>;}

/** An invitation link (`?invitation=TOKEN`) is accepted for the signed-in person once, then dropped from the address bar. */
function InvitationAcceptance({onAccepted}:{onAccepted:()=>void}){
 const navigate=useNavigate(),[state,setState]=useState<{kind:'idle'|'accepting'|'accepted'|'failed';message?:string}>({kind:'idle'}),feedback=useRef<HTMLParagraphElement>(null),started=useRef(false);
 useEffect(()=>{const params=new URLSearchParams(window.location.search),token=params.get('invitation');if(!token||started.current)return;started.current=true;
  // Drop the token from the address bar through the router and wait for it, so its
  // sign-in checks are finished before the acceptance request starts.
  setState({kind:'accepting'});
  navigate({to:'/app/access',replace:true}).then(()=>api('/api/v2/access/invitations/accept',{token})).then(()=>{setState({kind:'accepted'});onAccepted();},async e=>{
   // Reopening the emailed invitation after accepting it is a normal way back in, not a failure.
   const member=await api<{workspaceId:string}[]>('/api/v2/access/workspaces').then(rows=>rows.length===1,()=>false);
   setState(member?{kind:'accepted',message:'already'}:{kind:'failed',message:e instanceof Error?e.message:'Invitation was not accepted.'});}).finally(()=>setTimeout(()=>feedback.current?.focus(),0));
 },[onAccepted,navigate]);
 if(state.kind==='idle')return null;
 return <section className="fold-panel" aria-label="Invitation"><h2>Your invitation</h2><p ref={feedback} tabIndex={-1} role={state.kind==='failed'?'alert':'status'}>{state.kind==='accepting'?'Accepting your invitation…':state.kind==='accepted'?(state.message==='already'?'You accepted this invitation before. Your collaborator access is active.':'Invitation accepted. Your collaborator access is active.'):`${state.message} Sign in with the email address the invitation was sent to, or ask for a new invitation link.`}</p></section>;
}
