import {formatDay} from '../formatters';

type Closed={lifecycle?:unknown;closed_at?:unknown;close_reason?:unknown};

/** "Won 4 Nov 2026": a closed deal's outcome and the day it closed, read alike in its header and its foot. */
export const closedOn=(record:Closed)=>`${record.lifecycle==='won'?'Won':'Lost'}${record.closed_at?` ${formatDay(String(record.closed_at))}`:''}`;

/** A won or lost deal's header: its dated outcome, then why it closed. */
export function DealOutcome({record}:{record:Closed}){
 return <div className="r-why r-outcome" data-testid="deal-outcome"><span className="r-chip">{closedOn(record)}</span><span>{String(record.close_reason??'')}</span></div>;
}
