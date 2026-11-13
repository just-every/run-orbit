import {mailboxSendProof} from '/workspace/orbit/tests/support/mailbox-send-proof.ts';
for (const provider of ['google','microsoft'] as const) {
  await mailboxSendProof(provider);
  process.stdout.write(JSON.stringify({probe:'OUT-013 mailbox public doors',provider,result:'passed'})+'\n');
}
