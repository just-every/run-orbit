import type {TestContext} from 'node:test';
import {salesMailWorkspace} from './sales-sanity-mail-workspace';
import {responsibleSalesInbox} from './sales-sanity-assistance';
import {ingestCustomerEvidence,reviewUnlinkedEvidence,distinguishInferredEvidence,finishRecommendation,refreshReadableEvidence} from './sales-sanity-mail-evidence';
import {reviewRecipientClock,holdRateLimitedApproval,personalizeReviewedContent,recheckSendAuthority} from './sales-sanity-mail-approval';
import {acceptSignedDelivery,verifyRelay,reconcileUnknownDelivery,expireProviderRetry,stopFollowUp,classifyProviderBounce} from './sales-sanity-mail-delivery';
import {followCustomerThread} from './sales-sanity-mail-thread';
export async function sellWithReviewedMail(db:D1Database,context:TestContext){
 const journey=salesMailWorkspace(db,context);
await ingestCustomerEvidence(journey);await reviewUnlinkedEvidence(journey);await distinguishInferredEvidence(journey);await finishRecommendation(journey);await refreshReadableEvidence(journey);
await reviewRecipientClock(journey);await reconcileUnknownDelivery(journey);await acceptSignedDelivery(journey);await verifyRelay(journey);await expireProviderRetry(journey);await holdRateLimitedApproval(journey);await stopFollowUp(journey);await recheckSendAuthority(journey);await classifyProviderBounce(journey);await responsibleSalesInbox(db);await personalizeReviewedContent(journey);await followCustomerThread(journey);
}
