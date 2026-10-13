import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
/**
 * The immutable native generations the fold proofs install and execute. Their
 * exact migrations/core and src bytes are retained in native-history/ as a
 * content-addressed snapshot (manifest.json lists each commit's paths and
 * SHA-256), so the proofs need no Git history: the public repository starts
 * from a parentless commit. Every byte is hash-checked before use.
 */
type Snapshot={tree:string;files:{path:string;sha256:string}[]};
const root=resolve('newtests/t096/native-history');
const manifest=JSON.parse(readFileSync(resolve(root,'manifest.json'),'utf8')) as {schemaVersion:1;commits:Record<string,Snapshot>};
export function nativeFiles(commit:string,prefix:string):{path:string;bytes:Buffer}[]{
 const snapshot=manifest.commits[commit];
 if(!snapshot)throw new Error(`No retained snapshot of immutable native commit ${commit}.`);
 const files=snapshot.files.filter(file=>file.path.startsWith(`${prefix}/`));
 if(!files.length)throw new Error(`Immutable native commit ${commit} retains nothing under ${prefix}.`);
 return files.map(({path,sha256})=>{const bytes=readFileSync(resolve(root,'blobs',sha256));if(createHash('sha256').update(bytes).digest('hex')!==sha256)throw new Error(`Retained native bytes for ${commit}:${path} do not match their recorded SHA-256.`);return{path,bytes};});
}
export function nativeFile(commit:string,path:string):Buffer{
 const file=nativeFiles(commit,path.slice(0,path.lastIndexOf('/'))).find(entry=>entry.path===path);
 if(!file)throw new Error(`Immutable native commit ${commit} has no ${path}.`);
 return file.bytes;
}
