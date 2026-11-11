import {z} from 'zod';

const subject=z.string().trim().min(1);
const body=z.string().trim().min(1);

/** Manual creation retains the caller's existing subject limit. */
export const manualDraftCreateContent=(subjectLimit:number)=>({
  subject:subject.max(subjectLimit),body:body.max(100000),
});

/** Editing has no native length ceiling; each transport keeps its own bounds. */
export const manualDraftEditContent={subject,body};
