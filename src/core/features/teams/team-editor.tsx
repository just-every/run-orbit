import type {SalesMember,Team} from './contracts';
export function TeamEditor({team,members,dashboards,change,membership}:{team:Team;members:SalesMember[];dashboards:{id:string;name:string}[];change:(team:Team,save:boolean)=>void;membership:(ids:string[])=>void}){
 return <details className="sales-teams__item"><summary>{team.name}<span>{team.active?`${team.memberIds.length} members`:'Inactive'}</span></summary>
  <label>Team name<input required maxLength={120} value={team.name} onChange={e=>change({...team,name:e.target.value},false)} onBlur={()=>change(team,true)}/></label>
  <label><input type="checkbox" checked={team.active} onChange={e=>change({...team,active:e.target.checked},true)}/>Active team</label>
  <label>Team dashboard<select value={team.defaultDashboardId??''} onChange={e=>change({...team,defaultDashboardId:e.target.value||null},true)}><option value="">No team default</option>{dashboards.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
  <fieldset disabled={!team.active} className="sales-teams__choices"><legend>Active members</legend>{members.map(member=><label key={member.id}><input type="checkbox" checked={team.memberIds.includes(member.id)} onChange={e=>membership(e.target.checked?[...team.memberIds,member.id]:team.memberIds.filter(id=>id!==member.id))}/>{member.name}</label>)}</fieldset>
 </details>;
}
