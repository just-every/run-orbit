import {realpathSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

// Verification files are execution evidence, never application source. A build
// materialization has no edition Git identity; local results remain reportable.
export function reportEditionCommit(root=process.cwd()) {
 const git=(...args)=>spawnSync('git',['-C',root,...args],{encoding:'utf8'});
 const top=git('rev-parse','--show-toplevel');
 if(top.status!==0||realpathSync(top.stdout.trim())!==realpathSync(root))return null;
 if(git('diff','--quiet','HEAD','--','.',':!verification').status!==0)return null;
 const untracked=git('ls-files','--others','--exclude-standard','-z');
 if(untracked.status!==0||untracked.stdout.split('\0').filter(Boolean).some(file=>!file.startsWith('verification/')))return null;
 const head=git('rev-parse','HEAD');
 return head.status===0?head.stdout.trim():null;
}
