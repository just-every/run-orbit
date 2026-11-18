import type {ZodError} from 'zod';

/** A refused request, said in sentences: the first few issues, each naming the tile or field it concerns. */
export function plainIssues(error:ZodError){
 const lines=[...new Set(error.issues.slice(0,3).map(issue=>{
  const path=issue.path,tile=path[0]==='definition'&&path[1]==='tiles'&&typeof path[2]==='number'?`Tile ${path[2]+1}: `:'';
  const message=issue.message.replace(/^Invalid input$/,'This value is not allowed.');
  return `${tile}${message}`.replace(/([^.!?])$/,'$1.');
 }))];
 return lines.join(' ')||'The request was not accepted.';
}
