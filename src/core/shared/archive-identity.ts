import {lineageHash} from './archive-lineage.ts';
import type {ArchiveManifest} from './archive-transfer-profile.ts';

/** Stable identity of validated manifest content across JSON/schema key ordering.
 * Array order and every stored value remain significant. This identifies a
 * resumable candidate; the server still checks every uploaded part's checksum.
 */
export async function archiveManifestIdentity(manifest:ArchiveManifest):Promise<string>{
 return lineageHash(JSON.parse(JSON.stringify(manifest)));
}

export async function sameArchiveManifest(left:ArchiveManifest,right:ArchiveManifest):Promise<boolean>{
 const [leftIdentity,rightIdentity]=await Promise.all([archiveManifestIdentity(left),archiveManifestIdentity(right)]);
 return leftIdentity===rightIdentity;
}

/** Parts must come from a complete, checksum-validated archive in file order. */
export async function archiveContentIdentity(manifest:ArchiveManifest,parts:readonly {index:number;sha256:string}[]):Promise<string>{
 if(parts.length!==manifest.parts||parts.some((part,index)=>part.index!==index||!/^[a-f0-9]{64}$/.test(part.sha256)))throw new Error('Archive content identity requires every validated part in order.');
 return lineageHash({manifest:JSON.parse(JSON.stringify(manifest)),parts:parts.map(({index,sha256})=>({index,sha256}))});
}
