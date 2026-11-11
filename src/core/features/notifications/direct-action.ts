import {AsyncLocalStorage} from 'node:async_hooks';

const directActor = new AsyncLocalStorage<string|undefined>();

/** Only a native, authenticated person's mutation enters this scope. Provider,
 * agent and background work use their own doors and never borrow the person. */
export function directNotificationAction<T>(actor:string,work:()=>T):T {
 return directActor.run(actor,work);
}

/** A provider's delivery result is automatic even after a person clicks Send. */
export function automaticNotificationAction<T>(work:()=>T):T {
 return directActor.run(undefined,work);
}

/** Triggers and explicit writers share the same recipient rule. The context
 * lives only inside a D1 transaction: neither concurrent requests nor a failed
 * batch can leave another person's identity behind. Existing notices stay put. */
export function notificationDatabase(db:D1Database):D1Database {
 const underlying = new WeakMap<D1PreparedStatement,D1PreparedStatement>();
 async function batch<T=unknown>(statements:D1PreparedStatement[]):Promise<D1Result<T>[]> {
  const original=statements.map(statement=>underlying.get(statement)??statement),actor=directActor.getStore();
  if(!actor)return db.batch<T>(original);
  const results=await db.batch<T>([
   db.prepare("INSERT INTO runtime_controls(name,value) VALUES('direct_notification_actor',?)").bind(actor),
   ...original,
   db.prepare("DELETE FROM runtime_controls WHERE name='direct_notification_actor'")
  ]);
  return results.slice(1,-1);
 }
 function wrap(statement:D1PreparedStatement,writes:boolean):D1PreparedStatement {
  const proxy=new Proxy(statement,{get(target,key){
   if(key==='bind')return (...values:unknown[])=>wrap(target.bind(...values),writes);
   if(writes&&(key==='run'||key==='all'))return async()=> (await batch([target]))[0];
   if(writes&&key==='first')return async(column?:string)=>{
    const row=(await batch<Record<string,unknown>>([target]))[0]!.results[0];
    return row?(column?row[column]:row):null;
   };
   if(writes&&key==='raw')return async(options?:{columnNames?:boolean})=>{
    const rows=(await batch<Record<string,unknown>>([target]))[0]!.results;
    return [...(options?.columnNames&&rows[0]?[Object.keys(rows[0])]:[]),...rows.map(row=>Object.values(row))];
   };
   const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;
  }});
  underlying.set(proxy,statement);return proxy;
 }
 return new Proxy(db,{get(target,key){
  if(key==='prepare')return (sql:string)=>wrap(target.prepare(sql),!/^\s*(SELECT|PRAGMA|EXPLAIN)\b/i.test(sql));
  if(key==='batch')return batch;
  const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;
 }});
}
