import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';

/** Execute canonical migration prefixes in real SQLite, with D1 batch semantics. */
export function contactSeedDatabase(prefix: number) {
  const sql = new DatabaseSync(':memory:');
  sql.exec('PRAGMA foreign_keys=ON');
  const files = readdirSync('migrations/core').filter(file=>file.endsWith('.sql')).sort();
  const migrate = (start: number, end = files.length) => {
    for (const file of files.slice(start,end)) sql.exec(readFileSync('migrations/core/'+file,'utf8'));
  };
  migrate(0,prefix);
  function prepare(query: string, params: any[] = []): any {
    return {
      bind(...values: any[]) { return prepare(query,values); },
      async first(column?: string) { const row=sql.prepare(query).get(...params)??null; return column&&row?row[column]:row; },
      async all() { return {results:sql.prepare(query).all(...params),success:true,meta:{}}; },
      async raw() { return sql.prepare(query).all(...params).map(row=>Object.values(row)); },
      async run() { const result=sql.prepare(query).run(...params); return {success:true,meta:{changes:Number(result.changes)}}; }
    };
  }
  const db = {prepare,async batch(statements: D1PreparedStatement[]) {
    sql.exec('BEGIN');
    try { const results=[]; for(const statement of statements) results.push(await statement.run()); sql.exec('COMMIT'); return results; }
    catch(error) { sql.exec('ROLLBACK'); throw error; }
  }} as unknown as D1Database;
  return {db,sql,migrate,close:()=>sql.close()};
}

export function contactSeedInput(id: string, email: string|null = `${id}@customer.test`, contactability: 'contactable'|'do_not_contact' = 'contactable') {
  return {id,name:`Contact ${id}`,email,emailKey:email,companyId:null,phone:null,jobTitle:null,timezone:null,contactability};
}

export function beforeSeedBatch(db: D1Database, before: ()=>Promise<void>) {
  let entered=false;
  return new Proxy(db,{get(target,key) {
    if(key==='batch') return async(statements: D1PreparedStatement[])=>{
      if(!entered) { entered=true; await before(); }
      return target.batch(statements);
    };
    const value=(target as any)[key];
    return typeof value==='function'?value.bind(target):value;
  }});
}
