import {readFile,readdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {selectLocalState} from '@runeditrun/rer/local/state';
import {reconcileOwnershipSchema} from './ownership-upgrade.mjs';

/** RER holds the local-operation lease before this hook opens the idle D1 file. */
export async function reconcileLocalOwnership(context){
 const state=resolve(context.root,context.demo?.state??await selectLocalState(context.root));
 const directory=join(state,'v3/d1/miniflare-D1DatabaseObject');
 let files;try{files=await readdir(directory);}catch(error){if(error.code==='ENOENT')return;throw error;}
 const {DatabaseSync}=await import('node:sqlite');
 const sql=await readFile(join(context.root,'migrations/core/0042_record_ownership.sql'),'utf8');
 for(const file of files.filter(name=>name.endsWith('.sqlite'))){
  const connection=new DatabaseSync(join(directory,file));
  const db={prepare(sql){const statement=connection.prepare(sql);let values=[];return{bind(...bindings){values=bindings;return this;},async all(){return{results:statement.all(...values)};},async first(){return statement.get(...values)??null;},sql};},async batch(statements){connection.exec('BEGIN IMMEDIATE');try{for(const statement of statements)connection.exec(statement.sql);connection.exec('COMMIT');}catch(error){connection.exec('ROLLBACK');throw error;}}};
  try{connection.exec('PRAGMA foreign_keys=ON');if(await reconcileOwnershipSchema(db,sql))context.store.report('Reconciled installed ownership metadata without changing owner-authored record columns.');}finally{connection.close();}
 }
}
