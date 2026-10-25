import type {DashboardTile} from './schema';
import {measureCatalog} from '../analytics/sales-definition';
import type {SalesDefinition} from '../analytics/sales-definition';
import {dashboardLocal,forecastPeriod} from './display';
import {DashboardIcon} from './icons';
export type ReportChoice={id:string;version:number;body_json:string};
export type ResultChoice={id:string;asOf:string};
export function DashboardEditorTile({tile,index,sources,forecasts,results,update,timezone}:{tile:DashboardTile;index:number;sources:ReportChoice[];forecasts:{id:string;from:string;through:string}[];results:ResultChoice[];update:(patch:Partial<DashboardTile>)=>void;timezone:string}){
 const matches=sources.filter(source=>source.id===tile.sourceId).sort((a,b)=>b.version-a.version),selected=matches.find(source=>tile.version==='live'||source.version===tile.version),definition=selected?JSON.parse(selected.body_json) as SalesDefinition:null;
 const reports=[...new Map(sources.map(source=>[source.id,source])).values()];
 return <><h3>Tile {index+1} · {tile.source==='forecast'?'Forecast vs quota':measureCatalog[tile.measure].title}</h3>{tile.withdrawn&&<p className="dash-meta">This source was withdrawn. Choose a saved source again or remove this tile.</p>}<div className="sales-reports__fields">
  <label>Source type<select aria-label="Source type" value={tile.source} onChange={e=>{const forecast=e.target.value==='forecast',first=sources[0];update({withdrawn:false,source:forecast?'forecast':'report',kind:forecast?'forecast':'number',sourceId:forecast?forecasts[0]?.id??'':first?.id??'',version:forecast?'live':first?.version??'live',measure:first?JSON.parse(first.body_json).measures[0]:'pipeline',snapshotId:null});}}><option value="report">Saved sales report</option><option value="forecast">Forecast view</option></select></label>
  <label>Source<select aria-label="Source" value={tile.sourceId} onChange={e=>{const chosen=sources.find(source=>source.id===e.target.value);update({withdrawn:false,sourceId:e.target.value,version:tile.source==='forecast'?'live':chosen?.version??'live',measure:chosen?JSON.parse(chosen.body_json).measures[0]:tile.measure,snapshotId:null});}}><option value="">Choose a saved source</option>{tile.source==='report'?reports.map(source=><option key={source.id} value={source.id}>{JSON.parse(source.body_json).name}</option>):forecasts.map(f=><option key={f.id} value={f.id}>Forecast view · {forecastPeriod(f.from,f.through,timezone)}</option>)}</select></label>
  {tile.source==='report'&&<>
   <label>Measure<select aria-label="Measure" value={tile.measure} onChange={e=>update({measure:e.target.value as DashboardTile['measure']})}>{definition?.measures.map(measure=><option key={measure} value={measure}>{measureCatalog[measure].title}</option>)}</select></label>
   <label>Display<select aria-label="Display" value={tile.kind} onChange={e=>update({kind:e.target.value as DashboardTile['kind']})}><option value="number">Single number</option><option value="chart" disabled={tile.measure!=='pipeline'}>Chart</option><option value="table">Table</option></select></label>
   <details className="dash-editor__advanced"><summary>Version, saved result and field<DashboardIcon kind="chevron"/></summary><div className="sales-reports__fields">
   <label>Source version<select aria-label="Source version" value={tile.version} onChange={e=>{const version=e.target.value==='live'?'live':Number(e.target.value),source=matches.find(s=>version==='live'||s.version===version);update({version,snapshotId:null,measure:source?JSON.parse(source.body_json).measures[0]:tile.measure});}}><option value="live">Live: latest definition</option>{matches.map(source=><option key={source.version} value={source.version}>Version {source.version}</option>)}</select></label>
   <label>Result<select aria-label="Result" value={tile.snapshotId??''} disabled={tile.version==='live'} onChange={e=>update({snapshotId:e.target.value||null})}><option value="">Compute under the viewer's current access</option>{results.map(result=><option key={result.id} value={result.id}>Saved result measured {dashboardLocal(result.asOf,timezone,true)}</option>)}</select></label>
   <label>Shared field binding (dashboard field)<input aria-label="Shared field binding (dashboard field)" value={Object.keys(tile.bindings)[0]??''} onChange={e=>update({bindings:e.target.value?{[e.target.value]:Object.values(tile.bindings)[0]??e.target.value}:{}})}/></label>
   <label>Report field<input aria-label="Report field" value={Object.values(tile.bindings)[0]??''} disabled={!Object.keys(tile.bindings).length} onChange={e=>update({bindings:{[Object.keys(tile.bindings)[0]!]:e.target.value}})}/></label>
   </div></details>
  </>}
  {tile.source==='forecast'&&<label>Result<select aria-label="Result" value={tile.version} onChange={e=>update({version:e.target.value==='live'?'live':1})}><option value="live">Compute under the viewer's current access</option><option value={1}>This forecast view's saved result</option></select></label>}
  <label>Width (columns)<input aria-label="Width (columns)" type="number" min={3} max={12} value={tile.width} onChange={e=>update({width:Number(e.target.value)})}/></label>
  <label>Height (rows)<select aria-label="Height (rows)" value={tile.height} onChange={e=>update({height:Number(e.target.value) as 1|2})}><option value={1}>1</option><option value={2}>2</option></select></label>
 </div></>;
}
