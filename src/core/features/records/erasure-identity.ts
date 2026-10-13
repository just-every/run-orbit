/** Scan mailbox occurrences inside SQLite rather than loading archive rows.
 * Only single boundary characters use GLOB: D1 limits full LIKE/GLOB patterns.
 */
export function identityMatch(column:string){
 const text=`(' ' || lower(COALESCE(${column},'')) || ' ')`;
 return `EXISTS (
  WITH RECURSIVE identity(value) AS (SELECT lower(?)),
  occurrences(rest,pos) AS (
   SELECT ${text},instr(${text},value) FROM identity
   UNION ALL
   SELECT substr(rest,pos+1),instr(substr(rest,pos+1),value)
   FROM occurrences,identity WHERE pos>0
  )
  SELECT 1 FROM occurrences,identity WHERE pos>0
   AND substr(rest,pos-1,1) NOT GLOB '[a-z0-9.!#$%&''*+/=?^_\`{|}~@-]'
   AND (substr(rest,pos+length(value),1) NOT GLOB '[a-z0-9_@.-]'
    OR (substr(rest,pos+length(value),1)='.' AND substr(rest,pos+length(value)+1,1) NOT GLOB '[a-z0-9_@.-]'))
 )`;
}
export function identityPatterns(identity:string){return [identity];}
