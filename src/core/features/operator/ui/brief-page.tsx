import {OperatorShell} from './operator-shell';
import {TodayBrief} from './today-brief';

/** Brief: what changed in customer records since the operator last looked, account by account. */
export function BriefPage(){return <OperatorShell title="Brief"><TodayBrief/></OperatorShell>;}
