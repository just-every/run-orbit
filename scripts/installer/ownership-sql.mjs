import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
/** Build input remains importable in Worker, Node and TSX without a raw-SQL loader. */
export async function synchronizeOwnershipSql(root,{check=false}={}){
 const sql=await readFile(resolve(root,'migrations/core/0042_record_ownership.sql'),'utf8');
 const output='// Generated from migrations/core/0042_record_ownership.sql by scripts/installer/ownership-sql.mjs.\nexport const ownershipMigrationSql='+JSON.stringify(sql)+';\n';
 const path=resolve(root,'src/core/features/records/archive-ownership-sql.ts');
 if(check){if(await readFile(path,'utf8')!==output)throw Error('Ownership migration build input drifted. Run node scripts/installer/ownership-sql.mjs.');}
 else await writeFile(path,output);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await synchronizeOwnershipSql(process.cwd(),{check:process.argv.includes('--check')});
