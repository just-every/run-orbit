// Temporary runner-only instrumentation. No raw error, request, response, or header output.
import {Hono} from 'hono';
import {createApp as originalCreateApp} from '__ROOT__/tests/support/app';
import {AnalyticsMetrics} from '__ROOT__/src/core/features/analytics/metrics';
import {AccessService} from '__ROOT__/src/core/features/access/service';

const names = ['Error','TypeError','RangeError','SyntaxError','AggregateError','DOMException','AbortError','TimeoutError','RuntimeError','MiniflareCoreError','MiniflareError','D1Error','FetchError','AccessError','ZodError','AssertionError'];
const codes = ['permission','validation','prerequisite','conflict','SQLITE_BUSY','SQLITE_LOCKED','SQLITE_ERROR','SQLITE_CONSTRAINT','SQLITE_IOERR','SQLITE_FULL','SQLITE_CORRUPT','SQLITE_CANTOPEN','D1_ERROR','D1_EXEC_ERROR','D1_TYPE_ERROR','ECONNRESET','ECONNREFUSED','EPIPE','ETIMEDOUT','ENOSPC','EMFILE','ENOENT','UND_ERR_SOCKET','UND_ERR_CONNECT_TIMEOUT','UND_ERR_HEADERS_TIMEOUT','ERR_RUNTIME_FAILURE'];
const locations = ['src/core/app/mounts/fold.ts','src/core/app/app.ts','src/core/features/access/service.ts','src/core/features/analytics/metrics.ts','src/core/features/analytics/report-population.ts','src/core/features/analytics/native-sources.ts','src/core/features/operations/store.ts','src/core/platform/archive-maintenance.ts','tests/support/isolated-database.ts','node_modules/miniflare/','node_modules/wrangler/','node_modules/undici/','node:internal/deps/undici/'];
const categories: Array<[string,RegExp]> = [
  ['sqlite-busy',/SQLITE_BUSY|database is locked/i],['sqlite-locked',/SQLITE_LOCKED|table is locked/i],
  ['sqlite-constraint',/SQLITE_CONSTRAINT|constraint failed/i],['sqlite-schema',/no such (?:table|column)|has no column|schema has changed/i],
  ['sqlite-io',/SQLITE_IOERR|disk I\/O error/i],['disk-full',/SQLITE_FULL|ENOSPC|disk is full/i],
  ['sqlite-corrupt',/SQLITE_CORRUPT|database disk image is malformed/i],['sqlite-open',/SQLITE_CANTOPEN|unable to open database/i],
  ['d1',/D1_(?:ERROR|EXEC_ERROR|TYPE_ERROR)/],['workerd',/workerd|runtime failed to start/i],
  ['miniflare',/miniflare/i],['undici',/undici|UND_ERR_/i],['fetch-failed',/fetch failed/i],
  ['socket',/ECONNRESET|ECONNREFUSED|EPIPE|socket closed|other side closed/i],['timeout',/ETIMEDOUT|timed? ?out|timeout/i],
  ['resource-limit',/EMFILE|too many open files|out of memory/i],['json',/JSON|Unexpected token/i],
  ['native-workspace',/native workspace/i],['currency',/currency/i],['incomplete-population',/population|incomplete graph/i],
];
const text = (value: unknown) => typeof value === 'string' ? value : '';
const category = (value: unknown) => categories.filter(([,pattern])=>pattern.test(text(value))).map(([label])=>label);
const emit = (record: object) => {try {console.log('ORBIT_DIAGNOSTIC '+JSON.stringify(record));} catch {/* Logging must never replace the original behavior. */}};
function exception(error: unknown, depth=0): object {
  try {
    const e=error as any;
    const frames=text(e?.stack).split('\n').slice(1,13).flatMap(frame=>{
      const location=locations.find(allowed=>frame.includes(allowed));
      const position=frame.match(/:(\d+):(\d+)\)?\s*$/);
      return location?[{location,...(position?{line:Number(position[1]),column:Number(position[2])}:{})}]:[];
    });
    return {name:names.includes(e?.name)?e.name:'other',class:names.includes(e?.constructor?.name)?e.constructor.name:'other',code:codes.includes(e?.code)?e.code:'other',categories:category(e?.message),frames,...(depth<2&&e?.cause?{cause:exception(e.cause,depth+1)}:{})};
  } catch {return {name:'unreadable',class:'other',code:'other',categories:[],frames:[]};}
}
function observe(source:string,error:unknown){emit({event:'exception',source,error:exception(error)});}
for(const [klass,methods] of [[AnalyticsMetrics,['preview','checkSources']],[AccessService,['resolveOperatorContext']]] as const){
  for(const name of methods){const proto=klass.prototype as any,original=proto[name];
    proto[name]=async function(...args:any[]){try{return await original.apply(this,args);}catch(error){observe(name,error);throw error;}};
  }
}
export function createApp(...args:Parameters<typeof originalCreateApp>){
  const originalRoute=Hono.prototype.route;
  Hono.prototype.route=function(path:any,app:any){
    // Only the real fold custom handler: wrapping default handlers would alter Hono's composition branch.
    if(path==='/api/v2'){
      const original=app.errorHandler;
      app.errorHandler=function(error:any,...rest:any[]){observe('fold-error-handler',error);return original.call(this,error,...rest);};
    }
    return originalRoute.call(this,path,app);
  } as typeof originalRoute;
  let app:ReturnType<typeof originalCreateApp>;
  try {app=originalCreateApp(...args);} finally {Hono.prototype.route=originalRoute;}
  const original=app.errorHandler;
  app.errorHandler=function(error:any,...rest:any[]){observe('app-error-handler',error);return (original as any).call(this,error,...rest);};
  return app;
}
export async function diagnoseResponse(response:Response){
  let responseClass='success';
  if(response.status!==200){
    try {
      const body=await response.clone().json() as any;
      const message=body?.error;
      responseClass=message==='The operation was not confirmed.'?'generic-operation-failure'
        :message==='Workspace restoration is in progress. Continue or abort it in Records → Workspace data.'?'archive-maintenance'
        :category(message)[0]??'other-json-error';
    } catch {responseClass='non-json-error';}
  }
  emit({event:'response',status:response.status,responseClass});
}
