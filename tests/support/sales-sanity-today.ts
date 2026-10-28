import {salesDayWorkspace} from './sales-sanity-day-workspace';
import {startDay} from './sales-sanity-day-brief';
import {reviewEvidence} from './sales-sanity-day-intelligence';
import {prepareMeeting} from './sales-sanity-day-meetings';
import {assistedSalesDrafts} from './sales-sanity-assistance';
export async function sellFromToday(db:D1Database){const journey=salesDayWorkspace(db);await startDay(journey);await reviewEvidence(journey);await assistedSalesDrafts(db);await prepareMeeting(journey);}
