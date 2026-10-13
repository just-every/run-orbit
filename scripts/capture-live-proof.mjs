#!/usr/bin/env node
import {help,parse} from './capture-proof/input.mjs';
import {runProof} from './capture-proof/run.mjs';

if(process.argv.slice(2).length === 1 && process.argv[2] === '--help')process.stdout.write(help);
else {
 try {
  const result = await runProof(parse(process.argv.slice(2)));
  process.stdout.write(`Capture ${result.phase}: observed counters and source state. Receipt: ${JSON.stringify(result.path)}\nManual fixture and privacy checks remain; read the receipt's limitations.\n`);
 } catch(error) {
  process.stderr.write(`Capture proof: ${error.message}\n`);
  process.exitCode = 1;
 }
}
