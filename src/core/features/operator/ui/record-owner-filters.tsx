import type {RecordKind} from './records-api';

export function RecordOwnerFilters({kind,owner,onOwner,grouped,onGrouped,operators}:{kind:RecordKind;owner:string;onOwner:(value:string)=>void;grouped:boolean;onGrouped:(value:boolean)=>void;operators:any[]}){
 const noun=kind==='company'?'companies':'contacts';
 return <div className="records-filters"><label>Owner<select aria-label="Record owner" value={owner} onChange={event=>onOwner(event.target.value)}><option value="me">My {noun}</option><option value="">All {noun}</option><option value="unassigned">Unassigned</option>{operators.filter(operator=>operator.status==='active').map(operator=><option key={operator.id} value={operator.id}>{operator.display_name}</option>)}</select></label><label>Group records<select aria-label="Group records" value={grouped?'owner':'none'} onChange={event=>onGrouped(event.target.value==='owner')}><option value="none">No grouping</option><option value="owner">Owner</option></select></label></div>;
}

