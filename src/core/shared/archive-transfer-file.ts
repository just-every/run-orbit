import {validateManifest as validateV2Manifest} from './archive-file.ts';
import {validateTransferManifest} from './archive-transfer-profile.ts';
export {readArchiveFile} from './archive-file.ts';
export type {ArchiveManifest,ArchivePart,ArchiveEntry} from './archive-transfer-profile.ts';
export const validateManifest=(value:unknown)=>validateTransferManifest(value,validateV2Manifest);
