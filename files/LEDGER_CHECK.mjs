import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const {mapMigrationLedger}=await import(pathToFileURL(resolve('node_modules/@runeditrun/rer/cli/portability-migrations.mjs')).href);
const paths=execFileSync('git',['ls-tree','-r','--name-only','origin/main','--','migrations/core'],{encoding:'utf8'}).trim().split('\n').filter(path=>path.endsWith('.sql'));
const entries=paths.map(path=>({name:path.split('/').at(-1),sha256:createHash('sha256').update(execFileSync('git',['show','origin/main:'+path])).digest('hex')}));
const mapped=await mapMigrationLedger({root:process.cwd(),binding:'DB',entries});
console.log(JSON.stringify({status:'passed',preservedMainMigrations:mapped.length,newMigration:'0086_salesforce_import.sql'}));
