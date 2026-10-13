/** Validate saved events against the runner's independently reported totals/inventory. */
export function checkTestEvents(gate,executions,report){
 if(!Array.isArray(executions)||!Array.isArray(report))throw Error('Missing runner events.');
 if(!gate.result){if(executions.length||report.length)throw Error('Unexpected runner events.');return;}
 const runner=gate.browser?'playwright':'node:test';
 if(!executions.length||executions.some(row=>row.kind!=='test'||row.runner!==runner||row.status!=='passed'||!gate.files.includes(row.file)))throw Error('Missing, failed or unexpected test completions.');
 if(gate.files.some(file=>!executions.some(row=>row.file===file)))throw Error('Missing test file completions.');
 const summaries=report.filter(row=>row.kind==='summary');
 if(summaries.length!==1||summaries[0].runner!==runner||summaries[0].success!==true)throw Error('Missing or failed runner summary.');
 const counts=summaries[0].counts;
 if(!counts||Object.values(counts).some(count=>!Number.isSafeInteger(count)||count<0))throw Error('Invalid runner totals.');
 if(gate.browser){
  const inventories=report.filter(row=>row.kind==='inventory');
  if(report.length!==2||inventories.length!==1||inventories[0].runner!==runner||!Array.isArray(inventories[0].tests))throw Error('Missing browser collection inventory.');
  const tests=inventories[0].tests,ids=tests.map(test=>test.id);
  if(new Set(ids).size!==ids.length||tests.length!==executions.length||counts.tests!==tests.length||counts.completed!==executions.length||counts.passed!==executions.length)throw Error('Browser summary does not match completions.');
  for(const test of tests){
   const matches=executions.filter(row=>row.id===test.id);
   if(matches.length!==1||matches[0].name!==test.name||matches[0].file!==test.file)throw Error('Missing or duplicate collected browser test.');
  }
 }else{
  const suites=executions.filter(row=>row.type==='suite').length,tests=executions.length-suites;
  if(report.length!==1||executions.some(row=>!['test','suite'].includes(row.type)||!Number.isSafeInteger(row.nesting)||row.nesting<0)||counts.tests!==tests||counts.suites!==suites||counts.passed!==tests||counts.topLevel!==executions.filter(row=>row.nesting===0).length||['failed','cancelled','skipped','todo'].some(key=>counts[key]!==0))throw Error('Node summary does not match complete unfocused test results.');
 }
}
