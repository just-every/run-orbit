import {defaultSalesProfile,salesPermissions,salesRoles,type SalesMember,type SalesProfile} from './contracts';
import {FieldGrants} from './fields';
const names:Record<string,string>={'sales-admin':'Sales administrator',manager:'Manager',seller:'Seller','read-only':'Read only'};
const permissionNames:Record<string,string>={import:'Import records',export:'Export records','forecast.override':'Override forecasts','source.connect':'Connect sources','record.delete':'Delete records','workflow.author':'Author workflows','workflow.activate':'Activate workflows','sequence.author':'Author sequences','sequence.enroll':'Enroll in sequences','analytics.define':'Define reports','forecast.read':'Read forecasts'};
export function RoleEditor({member,change}:{member:SalesMember;change:(profile:SalesProfile)=>void}){
 const p=member.profile;
 return <details className="sales-teams__item"><summary>{member.name}<span>{member.owner?'Installation owner':p?names[p.role]:'Role not assigned'}</span></summary>
  <p>{member.email}</p>{member.owner?<p>The installation owner retains full recovery access.</p>:<>
  <label>Sales role<select value={p?.role??''} onChange={e=>change(defaultSalesProfile(e.target.value as SalesProfile['role']))}><option value="" disabled>Choose a role</option>{salesRoles.map(role=><option key={role} value={role}>{names[role]}</option>)}</select></label>
  {p&&<><label>Visible records<select value={p.scope} onChange={e=>change({...p,scope:e.target.value as SalesProfile['scope']})}><option value="all">All records</option><option value="team">Owned by team members and shared records</option><option value="assigned">Owned by this user and shared records</option></select></label>
  <label><input type="checkbox" checked={p.includeAssociations} onChange={e=>change({...p,includeAssociations:e.target.checked})}/>Include contacts and companies associated with owned deals</label>
  <FieldGrants value={p.fields} onChange={fields=>change({...p,fields})}/>
  <fieldset className="sales-teams__choices"><legend>Permissions</legend>{salesPermissions.map(permission=><label key={permission}><input type="checkbox" checked={p.permissions.includes(permission)} onChange={e=>change({...p,permissions:e.target.checked?[...p.permissions,permission]:p.permissions.filter(v=>v!==permission)})}/>{permissionNames[permission]}</label>)}</fieldset></>}
  </>}
 </details>;
}
