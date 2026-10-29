import type {ReactNode} from 'react';

/** Details: one card beside the work (after the next action from 900 px down), its values in groups. */
export function DetailsPanel({children}:{children:ReactNode}){
 return <aside className="operator-surface r-side" aria-labelledby="record-details" data-testid="record-details"><h2 id="record-details">Details</h2>{children}</aside>;
}
/** A group of values under a hairline; the first has no heading. */
export function DetailsGroup({title,label,children}:{title?:string;label?:string;children:ReactNode}){
 return <section className="r-group" aria-label={title?undefined:label}>{title?<h3>{title}</h3>:null}{children}</section>;
}
