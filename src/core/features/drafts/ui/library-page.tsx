import {useCallback,useState} from 'react';
import {OperatorShell,OperatorState} from '../../operator/ui/operator-shell';
import {useOperatorResource} from '../../operator/ui/use-operator-resource';
import type {LibraryEntry,LibraryInput} from '../library-repository';
import {libraryRequest,type LibraryState} from './library-api';
import './library.css';
const blank:LibraryInput={kind:'template',name:'',subject:'',body:'',visibility:'private'};
export function LibraryPage(){
 const load=useCallback(()=>libraryRequest<LibraryState>(),[]),resource=useOperatorResource('message-library',load);
 const [selected,setSelected]=useState<LibraryEntry|null>(null),[form,setForm]=useState<LibraryInput>(blank),[query,setQuery]=useState(''),[kind,setKind]=useState('all'),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[deleting,setDeleting]=useState(false);
 const state=resource.data,editable=!!state&&state.canAuthor&&(!selected||selected.owner_id===state.actorId||state.admin);
 function choose(entry:LibraryEntry|null){setSelected(entry);setForm(entry?{kind:entry.kind,name:entry.name,subject:entry.subject,body:entry.body,visibility:entry.visibility,teamId:entry.team_id}:blank);setNotice('');setError('');setDeleting(false);}
 async function save(){setBusy(true);setError('');try{const entry=await libraryRequest<LibraryEntry>(selected?`/${selected.id}`:'',selected?'PUT':'POST',{...form,...(selected?{revision:selected.revision}:{})});setSelected(entry);setNotice(`Saved ${entry.name}, revision ${entry.revision}. Existing approved messages keep their rendered content.`);resource.reload();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function remove(){if(!selected)return;setBusy(true);setError('');try{await libraryRequest(`/${selected.id}`,'DELETE',{revision:selected.revision});choose(null);setNotice('Entry deleted. Existing approved messages keep their rendered content.');resource.reload();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <OperatorShell eyebrow="Reusable sales content" title="Message library" action={<a className="operator-back-link" href="/app">← NOW</a>}>
  <p className="library-intro">Create a message once, then review its rendered content for each customer. Choose a private, team or workspace audience for each entry.</p>
  {resource.loading&&<OperatorState>Loading library…</OperatorState>}{resource.error&&<OperatorState kind="error">{resource.error.message}</OperatorState>}
  {state&&<div className="message-library-layout">
   <section className="operator-surface library-list" aria-label="Saved message content">
    <div className="library-list-heading"><h2>Saved content</h2><button type="button" onClick={()=>choose(null)}>New entry</button></div>
    <label>Search library<input type="search" value={query} onChange={e=>setQuery(e.target.value)}/></label>
    <label>Content type<select aria-label="Content type" value={kind} onChange={e=>setKind(e.target.value)}><option value="all">All content</option><option value="template">Templates</option><option value="snippet">Snippets</option><option value="signature">Signatures</option></select></label>
    <ul>{state.entries.filter(entry=>(kind==='all'||entry.kind===kind)&&entry.name.toLowerCase().includes(query.toLowerCase())).map(entry=><li key={entry.id}><button type="button" aria-pressed={selected?.id===entry.id} onClick={()=>choose(entry)}><strong>{entry.name}</strong><span>{entry.kind} · {entry.team_id?state.teams.find(team=>team.id===entry.team_id)?.name??'Sales team':entry.visibility} · revision {entry.revision}</span></button></li>)}</ul>
    {!state.entries.length&&<p>No saved content yet. Create your first template, snippet or signature.</p>}
   </section>
   <section className="operator-surface library-editor" aria-label="Edit library content">
    <h2>{selected?selected.name:'New library entry'}</h2>
    {selected&&<p>Revision {selected.revision} · {selected.visibility}</p>}
    {!editable&&<p>Your current role can read this entry. Its author or a sales administrator manages it.</p>}
    <form onSubmit={event=>{event.preventDefault();void save();}}><fieldset disabled={busy||!editable}>
     <label>Name<input required maxLength={120} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
     <div className="library-choices"><label>Kind<select aria-label="Kind" value={form.kind} onChange={e=>setForm({...form,kind:e.target.value as LibraryInput['kind']})}><option value="template">Template</option><option value="snippet">Snippet</option><option value="signature">Signature</option></select></label>
     <label>Visibility<select aria-label="Visibility" value={form.visibility==='shared'&&form.teamId?'team':form.visibility} onChange={e=>setForm({...form,visibility:e.target.value==='private'?'private':'shared',teamId:e.target.value==='team'?state.teams[0]?.id:null})}><option value="private">Private — only me</option>{(state.admin||form.visibility==='shared'&&!form.teamId)&&<option value="shared">Shared — workspace</option>}{state.teams.length>0&&<option value="team">Shared — sales team</option>}</select></label></div>
     {form.visibility==='shared'&&form.teamId&&<label>Sales team<select aria-label="Sales team" value={form.teamId} onChange={e=>setForm({...form,teamId:e.target.value})}>{state.teams.map(team=><option key={team.id} value={team.id}>{team.name}</option>)}</select></label>}
     {form.kind==='template'&&<label>Subject<input required maxLength={998} value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})}/></label>}
     <label>Body<textarea required rows={10} maxLength={100000} value={form.body} onChange={e=>setForm({...form,body:e.target.value})}/></label>
     <details className="library-field-help"><summary>Available merge fields</summary><p>Insert a field exactly as shown. Every used value must exist on the current record and be reviewed before approval.</p><ul>{state.fields.map(field=><li key={field}><code>{`{{${field}}}`}</code></li>)}</ul></details>
     <button type="submit" className="operator-primary-button">{busy?'Saving…':selected?'Save new revision':'Save entry'}</button>
    </fieldset></form>
    {selected&&editable&&<div className="library-delete">{deleting?<><p>Delete this entry? Drafts using it will need current content before approval.</p><button type="button" disabled={busy} onClick={()=>void remove()}>Confirm delete entry</button><button type="button" onClick={()=>setDeleting(false)}>Cancel</button></>:<button type="button" className="operator-text-button" onClick={()=>setDeleting(true)}>Delete entry</button>}</div>}
    {error&&<OperatorState kind="error">{error}</OperatorState>}{notice&&<OperatorState>{notice}</OperatorState>}
   </section>
  </div>}
 </OperatorShell>;
}
