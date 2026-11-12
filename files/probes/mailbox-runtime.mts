import {mailboxSendProof} from '/workspace/run-orbit/tests/support/mailbox-send-proof';
await mailboxSendProof('google');
await mailboxSendProof('microsoft');
console.log('Mailbox HTTP proof passed');
