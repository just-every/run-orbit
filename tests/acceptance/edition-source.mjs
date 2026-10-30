import {execFileSync} from 'node:child_process';

// This identifies the local source candidate; deployment-version evidence is separate.
export function verifiedEditionCommit(root=process.cwd()) {
 const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
 if(git('status','--porcelain','--untracked-files=all'))throw new Error('Hosted receipts require clean committed edition source.');
 execFileSync(process.execPath,['node_modules/@runeditrun/rer/edition-authoring/cli.mjs','check'],{cwd:root,stdio:'pipe'});
 return git('rev-parse','HEAD');
}
