/** Let two public calls observe no receipt, then finish the first before the
 * second reads its record. This exposes the same-key snapshot race reliably. */
export function delegationReplayRace(database:D1Database){
 let active=false,lookups=0,ready:()=>void=()=>{},committed:()=>void=()=>{};
 let both=Promise.resolve(),firstCommit=Promise.resolve();
 const wrap=(statement:D1PreparedStatement):D1PreparedStatement=>new Proxy(statement,{get(target,key){
  if(key==='bind')return(...args:any[])=>wrap(target.bind(...args));
  if(key==='first')return async(...args:any[])=>{
   const row=await target.first(...args as []);
   if(!active||row!==null)return row;
   const ordinal=++lookups;
   if(ordinal===1)await both;
   if(ordinal===2){ready();await firstCommit;}
   return row;
  };
  const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;
 }});
 const db=new Proxy(database,{get(target,key){
  if(key==='prepare')return(sql:string)=>{
   const statement=target.prepare(sql);
   return active&&sql.startsWith('SELECT request_hash FROM delegation_receipts')?wrap(statement):statement;
  };
  if(key==='batch')return async(statements:D1PreparedStatement[])=>{
   const result=await target.batch(statements);if(active)committed();return result;
  };
  const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;
 }});
 return {db,start(){lookups=0;both=new Promise(resolve=>{ready=resolve;});firstCommit=new Promise(resolve=>{committed=resolve;});active=true;},stop(){active=false;ready();committed();}};
}
