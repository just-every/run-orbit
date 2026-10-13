import { editorLeaf } from "../editor/leaf";
import {AccessNavigation} from '../core/features/operator/ui/access-navigation';
import {useRef,useState} from 'react';
import {createFileRoute} from '@tanstack/react-router';
import {FoldWorkspace,FoldShell,api} from '../core/features/fold-ui/workspace';
import {CollaboratorConsole} from '../core/features/access/collaborator-console';
export const Route=createFileRoute('/app/access')({component:editorLeaf(AccessPage)});
function AccessPage(){const[accepted,setAccepted]=useState(false),[error,setError]=useState(''),feedback=useRef<HTMLParagraphElement>(null);return <FoldShell title="Accept collaborator invitation"><AccessNavigation/><section className="fold-panel"><form onSubmit={async event=>{event.preventDefault();const data=new FormData(event.currentTarget);try{await api('/api/v2/access/invitations/accept',{token:String(data.get('token'))});setAccepted(true);setError('');}catch(e){setError(e instanceof Error?e.message:'Invitation was not accepted.');}feedback.current?.focus();}}><label>Invitation token<input name="token" type="password" required autoComplete="off"/></label><button>Accept invitation</button><p role={error?'alert':'status'} ref={feedback} tabIndex={-1}>{error||(accepted?'Invitation accepted. Your collaborator access is active.':'Sign in as the invited email address before accepting.')}</p></form></section><FoldWorkspace key={String(accepted)} embedded title="Manage collaborator access">{workspace=><CollaboratorConsole workspaceId={workspace}/>}</FoldWorkspace></FoldShell>;}
