import {archiveOperatorAccess,previewArchive,type ArchivePreview} from './archive-preview';
import {useOperatorDialog} from './operator-dialog';
import {useEffect,useRef,useState} from 'react';
import {abortArchive,archiveUrl,prepareArchive,restoreArchive,unfinishedTransfers,type ArchiveStatus} from './archive-transfer';
import './workspace-archive.css';
export function WorkspaceArchiveTools(){
 const {ask,dialog}=useOperatorDialog();
 const [exportId,setExportId]=useState(''),[importId,setImportId]=useState('');
 const [exportState,setExportState]=useState<ArchiveStatus>(),[importState,setImportState]=useState<ArchiveStatus>();
 const [file,setFile]=useState<File>(),[confirmed,setConfirmed]=useState(false),[validated,setValidated]=useState(0);
 const [busy,setBusy]=useState<'export'|'import'|'cancel'|null>(null),[error,setError]=useState(''),[paused,setPaused]=useState(false);
 const [unfinished,setUnfinished]=useState<ArchiveStatus[]>([]),[unfinishedExports,setUnfinishedExports]=useState<ArchiveStatus[]>([]);
 const [preview,setPreview]=useState<ArchivePreview>(),[checking,setChecking]=useState(false);
 const stop=useRef(false);
 useEffect(()=>{let active=true;setPreview(undefined);setConfirmed(false);if(file){setChecking(true);setError('');void previewArchive(file).then(value=>{if(active)setPreview(value);},reason=>{if(active)setError(reason instanceof Error?reason.message:'Archive could not be checked.');}).finally(()=>{if(active)setChecking(false);});}else setChecking(false);return()=>{active=false;};},[file]);
 useEffect(()=>{try{setExportId(sessionStorage.getItem('orbit:archive:export')??'');setImportId(sessionStorage.getItem('orbit:archive:import')??'');}catch{setError('This browser cannot remember transfer IDs. Copy the displayed ID before leaving.');}},[]);
 const remember=(kind:string,id:string)=>{try{sessionStorage.setItem(`orbit:archive:${kind}`,id);}catch{setError('Copy the transfer ID before leaving; browser storage is unavailable.');}};
 const updateExport=(status:ArchiveStatus)=>{setExportState(status);setExportId(status.id);remember('export',status.id);};
 const updateImport=(status:ArchiveStatus)=>{setImportState(status);setImportId(status.id);remember('import',status.id);};
 async function run(kind:'export'|'import'|'cancel',work:()=>Promise<unknown>){setBusy(kind);setError('');setPaused(false);stop.current=false;try{await work();}catch(reason){setError(reason instanceof Error?reason.message:'Archive transfer failed.');}finally{setBusy(null);}}
 return <section className="workspace-archive" aria-label="Workspace archives">
  <header><p className="operator-kicker">Workspace data</p><h2>Export and restore</h2><p>Keep a complete archive of this workspace, or restore one into an empty customer database.</p></header>
  <section className="workspace-archive__panel" aria-labelledby="archive-export-title"><h3 id="archive-export-title">Export archive</h3><p>Prepare an immutable snapshot, then download its streamed JSON archive.</p>
   <button disabled={!!busy} onClick={()=>void run('export',async()=>setUnfinishedExports(await unfinishedTransfers('exports')))}>Find unfinished exports</button>
   {unfinishedExports.map(status=><p key={status.id}><button disabled={!!busy} onClick={()=>updateExport(status)}>Use export {status.id}</button> — {status.state}</p>)}
   <label>Export transfer ID<input value={exportId} onChange={event=>{setExportId(event.target.value);setExportState(undefined);}} disabled={!!busy} placeholder="Leave empty to prepare a new archive"/></label>
   <ArchiveProgress status={exportState}/>
   <div className="workspace-archive__actions"><button disabled={!!busy} onClick={()=>void run('export',()=>prepareArchive(exportId,updateExport,()=>stop.current))}>{exportId?'Resume export':'Prepare export'}</button>
   {busy==='export'&&<button onClick={()=>{stop.current=true;setPaused(true);}}>Pause after current part</button>}
   {exportId&&exportState?.state!=='aborted'&&<button disabled={!!busy} onClick={async()=>{if(await ask({title:'Discard export',description:'Discard this export snapshot?',confirmLabel:'Discard export'})!==null)void run('cancel',()=>abortArchive('exports',exportId,updateExport));}}>Discard export</button>}</div>
   {exportState?.state==='preparing'&&<p role="status">The snapshot is being prepared in bounded parts. Workspace edits can continue; pause and resume this transfer without changing its snapshot.</p>}
   {exportState?.state==='ready'&&<a className="workspace-archive__download" href={archiveUrl('exports',exportState.id,'/download')} download>Download completed archive</a>}
  </section>
  <section className="workspace-archive__panel" aria-labelledby="archive-restore-title"><h3 id="archive-restore-title">Restore archive</h3><p>Choose the same archive again when resuming. Previously uploaded parts are checked for an exact match.</p>
   <button disabled={!!busy} onClick={()=>void run('import',async()=>setUnfinished(await unfinishedTransfers('imports')))}>Find unfinished restores</button>
   {unfinished.map(status=><p key={status.id}><button disabled={!!busy} onClick={()=>updateImport(status)}>Use restore {status.id}</button> — {status.state}</p>)}
   <label>Archive file<input type="file" accept="application/json,.json" disabled={!!busy} onChange={event=>{setFile(event.target.files?.[0]);setValidated(0);}}/></label>
   {checking&&<p role="status">Checking the archive and operator access before restore…</p>}
   {preview&&<section aria-label="Operator access after restore"><h4>Operator access after restore</h4><p>Current full operators keep their email, name and status. Collaborators require new invitations after restore. The current owner remains the owner. Matching email addresses use the archive identity so historical attribution stays intact. All sessions end when restore completes; sign in again with your current email.</p><p><strong>Current access:</strong></p><ul>{preview.current.map(operator=><li key={operator.id}>{operator.display_name} · {operator.email} · {operator.status}{operator.setup_owner?' · Owner kept':operator.collaborator?' · Collaborator access removed':' · Operator kept'}</li>)}</ul><p><strong>Operators in this archive:</strong></p><ul>{preview.operators.map(operator=>{const access=archiveOperatorAccess(operator,preview.current);return <li key={operator.id}>{operator.display_name} · {operator.email} · {access.status} · {access.explanation}</li>;})}</ul><p>{preview.rows.toLocaleString()} rows in {preview.parts} parts. Archive operators do not replace the current owner. A local trial owner is kept only for historical attribution when a real owner is already active; their open opportunities become unassigned and scheduled messages are cancelled.</p></section>}
   <label>Restore transfer ID<input value={importId} onChange={event=>{setImportId(event.target.value);setImportState(undefined);}} disabled={!!busy} placeholder="Leave empty to start a restore"/></label>
   <label className="workspace-archive__confirmation"><input type="checkbox" checked={confirmed} disabled={!!busy||!preview||checking} onChange={event=>setConfirmed(event.target.checked)}/>I confirm this target has no customer data and want to restore the selected archive.</label>
   <ArchiveProgress status={importState} validated={validated}/>
   <div className="workspace-archive__actions"><button disabled={!!busy||!file||!preview||checking||!confirmed||importState?.state==='complete'} onClick={()=>{if(file)void run('import',()=>restoreArchive(file,importId,updateImport,setValidated,()=>stop.current));}}>{importState?.state==='complete'?'Restore complete':importId?'Resume restore':'Start restore'}</button>
   {busy==='import'&&<button onClick={()=>{stop.current=true;setPaused(true);}}>Pause after current part</button>}
   {importId&&!['complete','aborted'].includes(importState?.state??'')&&<button disabled={!!busy} onClick={async()=>{if(await ask({title:'Cancel and roll back',description:'Cancel this restore and roll back any changes before releasing the workspace?',confirmLabel:'Cancel and roll back'})!==null)void run('cancel',()=>abortArchive('imports',importId,updateImport));}}>Cancel and roll back</button>}</div>
   {busy==='cancel'&&<p role="status">Waiting for the server to complete cancellation or rollback. The workspace stays protected until confirmed.</p>}
   {importState?.state==='restoring'&&<p role="status">Restore is applying bounded batches. Keep going or resume with this transfer ID; the workspace remains protected.</p>}
   {importState?.state==='complete'&&<p role="status">Restore complete. Your current owner and full operators were kept. Sessions were revoked; <a href="/signin">sign in again</a> before continuing.</p>}
   <p className="workspace-archive__notice">After restore, open Sources and choose Reconnect source for each signed source, then copy the new signing secret into its tool. Archives contain private customer data.</p>
  </section>
  {dialog}{paused&&<p role="status">Pausing after the current request. Keep the transfer ID to resume.</p>}{error&&<p role="alert">{error}</p>}
 </section>;
}
function ArchiveProgress({status,validated}:{status?:ArchiveStatus;validated?:number}){
 if(!status)return null;
 return <div aria-live="polite" data-archive-state={status.state}><p className="workspace-archive__state">{status.state==='restoring'?(status.phase==='backup'?'Saving recovery copy':status.phase==='clear'?'Clearing empty workspace':status.phase==='load'?'Restoring archive':status.phase?.startsWith('rollback')?'Rolling back restore':'Restoring'):status.state==='complete'?'Restore complete':status.state}</p><dl className="workspace-archive__metrics">
 {status.totalSteps!==undefined&&<div><dt>Restore steps</dt><dd>{status.completedSteps??0} / {status.totalSteps}</dd></div>}
 {status.totalTables!==undefined&&<div><dt>Tables in this phase</dt><dd>{status.completedTables??0} / {status.totalTables}</dd></div>}
 {validated!==undefined&&<div><dt>Parts validated</dt><dd>{validated}</dd></div>}
 {status.nextPart!==undefined&&<div><dt>Parts uploaded</dt><dd>{status.nextPart} / {status.manifest?.parts??status.nextPart}</dd></div>}
 {status.manifest&&<><div><dt>Archive parts</dt><dd>{status.manifest.parts}</dd></div><div><dt>Rows</dt><dd>{status.manifest.rows.toLocaleString()}</dd></div></>}
 </dl></div>;
}
