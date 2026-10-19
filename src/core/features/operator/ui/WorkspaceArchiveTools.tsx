import {archiveOperatorAccess,previewArchive,type ArchivePreview} from './archive-preview';
import {useOperatorDialog} from './operator-dialog';
import {useEffect,useRef,useState} from 'react';
import {abortArchive,archiveUrl,finishRestore,prepareArchive,restoreArchive,transferStatus,unfinishedTransfers,type ArchiveStatus} from './archive-transfer';
import './workspace-archive.css';
export function WorkspaceArchiveTools(){
 const {ask,dialog}=useOperatorDialog();
 const [exportId,setExportId]=useState(''),[importId,setImportId]=useState('');
 const [exportState,setExportState]=useState<ArchiveStatus>(),[importState,setImportState]=useState<ArchiveStatus>();
 const [file,setFile]=useState<File>(),[confirmed,setConfirmed]=useState(false),[validated,setValidated]=useState(0);
 const [busy,setBusy]=useState<'export'|'import'|'cancel'|null>(null),[error,setFailure]=useState({kind:'',text:''}),[paused,setPaused]=useState(false);
 const [unfinished,setUnfinished]=useState<ArchiveStatus[]>([]),[unfinishedExports,setUnfinishedExports]=useState<ArchiveStatus[]>([]);
 const [preview,setPreview]=useState<ArchivePreview>(),[checking,setChecking]=useState(false);
 const stop=useRef(false);
 const [returnMessage,setReturnMessage]=useState('');
 useEffect(()=>{let active=true;setPreview(undefined);setConfirmed(false);if(file){setChecking(true);setFailure({kind:'',text:''});void previewArchive(file).then(value=>{if(active)setPreview(value);},reason=>{if(active)setFailure({kind:'import',text:reason instanceof Error?reason.message:'Archive could not be checked.'});}).finally(()=>{if(active)setChecking(false);});}else setChecking(false);return()=>{active=false;};},[file]);
 const remember=(kind:string,id:string)=>{try{sessionStorage.setItem(`orbit:archive:${kind}`,id);}catch{setError('Copy the transfer ID before leaving; browser storage is unavailable.');}};
 const forget=(kind:string)=>{try{sessionStorage.removeItem(`orbit:archive:${kind}`);}catch{/* nothing was remembered */}};
 const updateExport=(status:ArchiveStatus)=>{if(status.state==='ready')setReturnMessage('Your export is finished and ready to download.');setExportState(status);setUnfinishedExports(items=>items.map(item=>item.id===status.id?status:item));setExportId(status.id);remember('export',status.id);};
 const updateImport=(status:ArchiveStatus)=>{if(status.state==='complete')setReturnMessage('Restore complete. Sign in again before continuing.');setImportState(status);setUnfinished(items=>items.map(item=>item.id===status.id?status:item));setImportId(status.id);if(finished(status.state))forget('import');else remember('import',status.id);};
 /** A failure is shown beside the button that caused it. */
 const setError=(text:string)=>setFailure({kind:'',text});
 const failure=(kinds:string[])=>error.text&&kinds.includes(error.kind)?<p role="alert">{error.text}</p>:null;
 async function run(kind:'export'|'import'|'cancel',work:()=>Promise<unknown>,panel:'export'|'import'=kind==='export'?'export':'import'){setBusy(kind);setFailure({kind:'',text:''});setPaused(false);stop.current=false;try{await work();}catch(reason){setFailure({kind:panel,text:reason instanceof Error?reason.message:'Archive transfer failed.'});}finally{setBusy(null);}}
 useEffect(()=>{
  let active=true;stop.current=false;
  void (async()=>{
   try{
    const rememberedExport=sessionStorage.getItem('orbit:archive:export')??'',rememberedImport=sessionStorage.getItem('orbit:archive:import')??'';
    if(rememberedExport){
     const status=await transferStatus('exports',rememberedExport);if(!active)return;
     if(status){updateExport(status);if(status.state==='preparing'){setReturnMessage('Resuming your export from its saved progress.');await run('export',()=>prepareArchive(status.id,updateExport,()=>stop.current));}}
     else forget('export');
    }
    if(rememberedImport){
     const status=await transferStatus('imports',rememberedImport);if(!active)return;
     if(!status||finished(status.state)){forget('import');setImportId('');}
     else{updateImport(status);if(status.state==='restoring'){setReturnMessage('Resuming your restore from its saved progress. The archive is already uploaded.');await run('import',()=>finishRestore(status.id,updateImport,()=>stop.current));}
      else setReturnMessage('Your restore progress is saved. Choose the same archive and tick the confirmation again to resume uploading.');}
    }
   }catch(reason){if(active)setError(reason instanceof Error?reason.message:'Saved transfer could not be resumed.');}
  })();
  return()=>{active=false;stop.current=true;};
 },[]);
 return <section className="workspace-archive" aria-label="Workspace archives">
  {returnMessage&&<p role="status">{returnMessage}</p>}
  <header><p className="operator-kicker">Workspace data</p><h2>Export and restore</h2><p>Keep a complete archive of this workspace, or restore one into an empty customer database.</p></header>
  <section className="workspace-archive__panel" aria-labelledby="archive-export-title"><h3 id="archive-export-title">Export archive</h3><p>Prepare an immutable snapshot, then download its streamed JSON archive. If you leave, progress is saved and preparation resumes when you return to this panel.</p>
   <button disabled={!!busy} onClick={()=>void run('export',async()=>setUnfinishedExports(await unfinishedTransfers('exports')))}>Find unfinished exports</button>
   {unfinishedExports.map(status=><p key={status.id}><button disabled={!!busy} onClick={()=>updateExport(status)}>Use export {status.id}</button> — {status.state==='ready'?'Finished — ready to download':status.state}</p>)}
   <label>Export transfer ID<input value={exportId} onChange={event=>{setExportId(event.target.value);setExportState(undefined);}} disabled={!!busy} placeholder="Leave empty to prepare a new archive"/></label>
   <ArchiveProgress status={exportState}/>
   <div className="workspace-archive__actions"><button disabled={!!busy} onClick={()=>void run('export',()=>prepareArchive(exportId,updateExport,()=>stop.current))}>{exportId?'Resume export':'Prepare export'}</button>
   {busy==='export'&&<button onClick={()=>{stop.current=true;setPaused(true);}}>Pause after current part</button>}
   {exportId&&exportState?.state!=='aborted'&&<button disabled={!!busy} onClick={async()=>{if(await ask({title:'Discard export',description:'Discard this export snapshot?',confirmLabel:'Discard export'})!==null)void run('cancel',()=>abortArchive('exports',exportId,updateExport),'export');}}>Discard export</button>}</div>
   {failure(['export'])}
   {exportState?.state==='preparing'&&<p role="status">The snapshot is being prepared in bounded parts. Workspace edits can continue; pause and resume this transfer without changing its snapshot.</p>}
   {exportState?.state==='ready'&&<a className="workspace-archive__download" href={archiveUrl('exports',exportState.id,'/download')} download>Download completed archive</a>}
  </section>
  <section className="workspace-archive__panel" aria-labelledby="archive-restore-title"><h3 id="archive-restore-title">Restore archive</h3><p>If you leave, progress is saved. Return to this panel to continue: while uploading, choose the same archive and tick the confirmation again; once uploaded, the restore resumes automatically. Previously uploaded parts are checked for an exact match.</p>
   <button disabled={!!busy} onClick={()=>void run('import',async()=>setUnfinished(await unfinishedTransfers('imports')))}>Find unfinished restores</button>
   {unfinished.map(status=><p key={status.id}><button disabled={!!busy} onClick={()=>updateImport(status)}>Use restore {status.id}</button> — {status.state==='ready'?'Finished — ready to download':status.state}</p>)}
   <label>Archive file<input type="file" accept="application/json,.json" disabled={!!busy} onChange={event=>{setFile(event.target.files?.[0]);setValidated(0);}}/></label>
   {checking&&<p role="status">Checking the archive and operator access before restore…</p>}
   {preview&&<section aria-label="Operator access after restore"><h4>Operator access after restore</h4><p>Current full operators keep their email, name and status. Collaborators require new invitations after restore. The current owner remains the owner. Matching email addresses use the archive identity so historical attribution stays intact. All sessions end when restore completes; sign in again with your current email.</p><p><strong>Current access:</strong></p><ul>{preview.current.map(operator=><li key={operator.id}>{operator.display_name} · {operator.email} · {operator.invited?'invited':operator.status}{operator.setup_owner?' · Owner kept':operator.invited?' · Invitation ends':operator.collaborator?' · Collaborator access removed':' · Operator kept'}</li>)}</ul><p><strong>Operators in this archive:</strong></p><ul>{preview.operators.map(operator=>{const access=archiveOperatorAccess(operator,preview.current);return <li key={operator.id}>{operator.display_name} · {operator.email} · {access.status} · {access.explanation}</li>;})}</ul><p>{preview.rows.toLocaleString()} rows in {preview.parts} parts. Archive operators do not replace the current owner. The archive’s own owner, a local trial owner and local dev personas (addresses at dev.localhost) are kept only for historical attribution when this installation already has a different owner; their open opportunities become unassigned. All restored scheduled messages are cancelled, including those of retained operators; review and approve new messages before sending.</p></section>}
   <label>Restore transfer ID<input value={importId} onChange={event=>{setImportId(event.target.value);setImportState(undefined);}} disabled={!!busy} placeholder="Leave empty to start a restore"/></label>
   <label className="workspace-archive__confirmation"><input type="checkbox" checked={confirmed} disabled={!!busy||!preview||checking} onChange={event=>setConfirmed(event.target.checked)}/>I confirm this target has no customer data and want to restore the selected archive.</label>
   {importId&&!confirmed&&importState?.state!=='restoring'&&!finished(importState?.state??'')&&<p>To resume, select the same archive and tick the confirmation above again.</p>}
   <ArchiveProgress status={importState} validated={validated}/>
   <div className="workspace-archive__actions"><button disabled={!!busy||!file||!preview||checking||!confirmed||importState?.state==='complete'} onClick={()=>{if(file)void run('import',()=>restoreArchive(file,importId,preview!.contentDigest,updateImport,setValidated,()=>stop.current));}}>{importState?.state==='complete'?'Restore complete':importId?'Resume restore':'Start restore'}</button>
   {busy==='import'&&<button onClick={()=>{stop.current=true;setPaused(true);}}>Pause after current part</button>}
   {importId&&importState&&!finished(importState.state)&&<button disabled={!!busy} onClick={async()=>{if(await ask({title:'Cancel and roll back',description:'Cancel this restore and roll back any changes before releasing the workspace?',confirmLabel:'Cancel and roll back'})!==null)void run('cancel',()=>abortArchive('imports',importId,updateImport),'import');}}>Cancel and roll back</button>}</div>
   {failure(['import'])}
   {busy==='cancel'&&<p role="status">Waiting for the server to complete cancellation or rollback. The workspace stays protected until confirmed.</p>}
   {importState?.state==='restoring'&&<p role="status">Restore is applying bounded batches. Keep going or resume with this transfer ID; the workspace remains protected.</p>}
   {importState?.state==='complete'&&<div role="status"><p>Restore complete. Your current owner and full operators were kept. Sessions were revoked; <a href="/signin">sign in again</a> before continuing.</p><p>Then redo these, which an archive never carries:</p><ol><li>Published forms, such as your contact form, are offline now. Open <a href="/app/forms">Forms</a>, choose Reopen latest publication, approve it and choose Publish approved page.</li><li>Open <a href="/app/sources">Sources</a> and choose Reconnect source for each signed source, then copy its new signing secret into its tool.</li><li>Review and approve customer follow-up again; restored scheduled messages were cancelled and kept as history.</li><li>Send yourself the mail sender test again under <a href="/app/settings#mail-sender">Settings</a>.</li></ol></div>}
   <p className="workspace-archive__notice">A restore takes published forms (such as your contact form) offline and needs signed sources reconnected, because an archive never carries their public permissions or secrets. You re-publish and reconnect them afterwards; this panel lists the steps when the restore finishes. All restored scheduled messages are cancelled and need new review and approval before sending. Archives contain private customer data.</p>
  </section>
  {dialog}{paused&&<p role="status">Pausing after the current request. Keep the transfer ID to resume.</p>}{failure([''])}
 </section>;
}
const finished=(state:string)=>state==='complete'||state==='aborted';
function ArchiveProgress({status,validated}:{status?:ArchiveStatus;validated?:number}){
 if(!status)return null;
 return <div aria-live="polite" data-archive-state={status.state}><p className="workspace-archive__state">{status.state==='restoring'?(status.phase==='backup'?'Saving recovery copy':status.phase==='clear'?'Clearing empty workspace':status.phase==='load'?'Restoring archive':status.phase?.startsWith('rollback')?'Rolling back restore':'Restoring'):status.state==='complete'?'Restore complete':status.state==='ready'?'Finished — ready to download':status.state}</p><dl className="workspace-archive__metrics">
 {status.totalSteps!==undefined&&<div><dt>Restore steps</dt><dd>{status.completedSteps??0} / {status.totalSteps}</dd></div>}
 {status.totalTables!==undefined&&<div><dt>Tables in this phase</dt><dd>{status.completedTables??0} / {status.totalTables}</dd></div>}
 {validated!==undefined&&<div><dt>Parts validated</dt><dd>{validated}</dd></div>}
 {status.nextPart!==undefined&&<div><dt>Parts uploaded</dt><dd>{status.nextPart} / {status.manifest?.parts??status.nextPart}</dd></div>}
 {status.manifest&&<><div><dt>Archive parts</dt><dd>{status.manifest.parts}</dd></div><div><dt>Rows</dt><dd>{status.manifest.rows.toLocaleString()}</dd></div></>}
 </dl></div>;
}
