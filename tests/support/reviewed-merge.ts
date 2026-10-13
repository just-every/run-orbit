import type {ImportMergeRepository} from '../../src/core/features/records/import-merge';
import {mergeReviewToken} from '../../src/core/features/records/merge-review';
import {requireRecord} from '../../src/core/features/records/shared';

/** Existing repository scenarios take the same current-row review as the native UI. */
export async function reviewedMerge(repo:ImportMergeRepository,kind:'contact'|'company',survivorId:string,retiredId:string,choices:Record<string,'survivor'|'retired'>,actor:string){
 const survivor=await requireRecord(repo.db,kind,survivorId),retired=await requireRecord(repo.db,kind,retiredId);
 return repo.merge(kind,survivorId,retiredId,choices,actor,{survivor:await mergeReviewToken(survivor),retired:await mergeReviewToken(retired)});
}

/** The review a public merge request carries, read from the current rows as the duplicate listing does. */
export async function reviewTokens(db:D1Database,kind:'contact'|'company',survivorId:string,retiredId:string){
 return {survivor:await mergeReviewToken(await requireRecord(db,kind,survivorId)),retired:await mergeReviewToken(await requireRecord(db,kind,retiredId))};
}
