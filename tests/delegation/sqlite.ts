import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
/** Real SQLite SQL/transaction execution for fast source tests; runtime suite uses D1 separately. */
export function sqliteDatabase(){const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');for(const f of readdirSync('migrations/core').sort())sql.exec(readFileSync('migrations/core/'+f,'utf8'));
 function prepare(query:string,params:unknown[]=[]):any{return {bind(...values:unknown[]){return prepare(query,values);},async first(column?:string){const r=sql.prepare(query).get(...params as any[])??null;return column&&r?r[column]:r;},async all(){return {results:sql.prepare(query).all(...params as any[]),success:true,meta:{}};},async raw(){return sql.prepare(query).all(...params as any[]).map(r=>Object.values(r));},async run(){const r=sql.prepare(query).run(...params as any[]);return {success:true,meta:{changes:Number(r.changes)}};}};}
 const db={prepare,async batch(statements:any[]){sql.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());sql.exec('COMMIT');return results;}catch(e){sql.exec('ROLLBACK');throw e;}},async exec(query:string){sql.exec(query);}} as unknown as D1Database;
 return {db,close:()=>sql.close()};}
