import {verificationPlan} from './verification-plan.mjs';
import {runShard,resetVerification} from './verification-shard.mjs';
// Standalone additive qualification retains every fold file, one runner at a time.
resetVerification();
for(const name of Object.keys(verificationPlan()).filter(name=>name.startsWith('fold-')))if(!runShard(name)){process.exitCode=1;break;}
