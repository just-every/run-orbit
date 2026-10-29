import type {ReviewSummary} from '../../today/review-summary';

export async function readReviewSummary():Promise<ReviewSummary>{const response=await fetch('/api/v1/review/summary');if(!response.ok)throw Error('Review could not load.');return response.json();}

const kinds:[keyof ReviewSummary,string,string][]=[['proposals','proposed change','proposed changes'],['events','event','events'],['replies','reply','replies'],['calls','call','calls']];

/** NOW's review line: while something waits for a person, how much and of what kind, and the way to Review. */
export function ReviewLine({summary}:{summary:ReviewSummary|null}){
 if(!summary)return null;
 const waiting=kinds.filter(([key])=>summary[key]>0),total=waiting.reduce((sum,[key])=>sum+summary[key],0);
 if(!total)return null;
 const [, one, many]=waiting.length===1?waiting[0]!:[null,'item','items'];
 return <p className="now-line now-line--review"><span>{total} {total===1?one:many} {total===1?'waits':'wait'} for review</span><a href="/app/review">Review</a></p>;
}
