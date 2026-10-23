/** Shared review for a selected set of records, including each refused item. */
export interface ReviewedRecordChange {
 recordId:string;
 name:string;
 previousOwnerName:string|null;
 newOwnerName:string|null;
 failure:string|null;
 applied?:boolean;
 undone?:boolean;
}
export function ReviewedRecordChanges({items}:{items:ReviewedRecordChange[]}) {
 return <ol className="record-change-review">{items.map(item=><li key={item.recordId}>
  <h3>{item.name}</h3>
  <dl><div><dt>Current owner</dt><dd>{item.previousOwnerName??'Unassigned'}</dd></div><div><dt>New owner</dt><dd>{item.newOwnerName??'Unassigned'}</dd></div></dl>
  {item.failure?<p role="status">Not changed: {item.failure}</p>:item.undone?<p>Previous owner restored</p>:item.applied?<p>Owner changed</p>:null}
 </li>)}</ol>;
}
