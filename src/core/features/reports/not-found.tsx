import {ReportsTitle} from './title';

/** An address the viewer cannot open: a made-up id, an id not shared with them, or a built-in they cannot define. */
export function NotFound(){
 return <div className="reports-page"><ReportsTitle title="Not found"/><p className="reports-quiet-line">There is no report at this address.</p></div>;
}
/** The forecast's typed address in a workspace that does not use US dollars: one line and the way back, no form and no request. */
export function ForecastUnavailable({currency}:{currency:string}){
 return <div className="reports-page"><ReportsTitle title="Sales forecast"/><p className="reports-quiet-line">Forecasts need a US-dollar workspace; this one uses {currency}.</p></div>;
}
