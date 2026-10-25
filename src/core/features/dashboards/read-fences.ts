import type {ActorContext,SqlStatement} from '../../shared/expansion-contracts';
import type {Dashboards,TileResult} from './repository';
import type {DashboardDefinition} from './schema';

/** A composed response must still have every source it opened when its last read finishes. */
export async function dashboardSourceFences(dashboards:Dashboards,c:ActorContext,definition:DashboardDefinition,tiles:TileResult[]):Promise<SqlStatement[]>{
 const proofs:SqlStatement[]=[];
 for(const result of tiles){
  if(result.status==='unavailable')continue;
  const tile=definition.tiles.find(tile=>tile.id===result.id)!;
  if(tile.source==='forecast'){
   proofs.push(...dashboards.store.guard('EXISTS(SELECT 1 FROM forecast_snapshots WHERE workspace_id=? AND id=?)',[c.workspaceId,tile.sourceId]));
  }else{
   proofs.push(...await dashboards.metrics.sales.shares.assertVisible(c,tile.sourceId));
   proofs.push(...dashboards.store.guard('EXISTS(SELECT 1 FROM analytics_definitions WHERE workspace_id=? AND id=? AND (?=\'live\' OR version=?))',[c.workspaceId,tile.sourceId,tile.version,tile.version]));
   if(tile.snapshotId)proofs.push(...dashboards.store.guard('EXISTS(SELECT 1 FROM analytics_snapshots WHERE workspace_id=? AND id=? AND definition_id=? AND definition_version=?)',[c.workspaceId,tile.snapshotId,tile.sourceId,tile.version]));
  }
 }
 return proofs;
}
