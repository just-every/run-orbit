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
 const stop=useRef(false);
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
   <label>Restore transfer ID<input value={importId} onChange={event=>{setImportId(event.target.value);setImportState(undefined);}} disabled={!!busy} placeholder="Leave empty to start a restore"/></label>
   <label className="workspace-archive__confirmation"><input type="checkbox" checked={confirmed} disabled={!!busy} onChange={event=>setConfirmed(event.target.checked)}/>I confirm this target has no customer data and want to restore the selected archive.</label>
   <ArchiveProgress status={importState} validated={validated}/>
   <div className="workspace-archive__actions"><button disabled={!!busy||!file||!confirmed||importState?.state==='complete'} onClick={()=>{if(file)void run('import',()=>restoreArchive(file,importId,updateImport,setValidated,()=>stop.current));}}>{importId?'Resume restore':'Start restore'}</button>
   {busy==='import'&&<button onClick={()=>{stop.current=true;setPaused(true);}}>Pause after current part</button>}
   {importId&&!['complete','aborted'].includes(importState?.state??'')&&<button disabled={!!busy} onClick={async()=>{if(await ask({title:'Cancel and roll back',description:'Cancel this restore and roll back any changes before releasing the workspace?',confirmLabel:'Cancel and roll back'})!==null)void run('cancel',()=>abortArchive('imports',importId,updateImport));}}>Cancel and roll back</button>}</div>
   {busy==='cancel'&&<p role="status">Waiting for the server to complete cancellation or rollback. The workspace stays protected until confirmed.</p>}
   {importState?.state==='restoring'&&<p role="status">Restore is applying bounded batches. Keep going or resume with this transfer ID; the workspace remains protected.</p>}
   {importState?.state==='complete'&&<p role="status">Restore completed. Sessions were revoked; sign in again before continuing.</p>}
   <p className="workspace-archive__notice">Source secrets must be configured again after a restore. Archives contain private customer data.</p>
  </section>
  {dialog}{paused&&<p role="status">Pausing after the current request. Keep the transfer ID to resume.</p>}{error&&<p role="alert">{error}</p>}
 </section>;
}
function ArchiveProgress({status,validated}:{status?:ArchiveStatus;validated?:number}){
 if(!status)return null;
 return <div aria-live="polite"><p className="workspace-archive__state">{status.state}</p><dl className="workspace-archive__metrics">
 {status.totalTables!==undefined&&<div><dt>Tables</dt><dd>{status.completedTables??0} / {status.totalTables}</dd></div>}
 {validated!==undefined&&<div><dt>Parts validated</dt><dd>{validated}</dd></div>}
 {status.nextPart!==undefined&&<div><dt>Parts uploaded</dt><dd>{status.nextPart}</dd></div>}
 {status.manifest&&<><div><dt>Archive parts</dt><dd>{status.manifest.parts}</dd></div><div><dt>Rows</dt><dd>{status.manifest.rows.toLocaleString()}</dd></div></>}
 </dl></div>;
}
