/** Provider outcomes describe what Orbit knows about this approved message. */
export function messageStatus(state: string): string {
  const statuses: Record<string, string> = {
    accepted: 'Accepted by the mail provider.',
    delivered: 'Delivery reported by the mail provider.',
    queued: 'Approved and waiting for the mail provider.',
    reconciling: 'Checking whether the mail provider accepted this message.',
    'delivery-unknown': 'The mail provider’s acceptance is unresolved.',
    failed: 'The mail provider did not accept this message.',
    bounced: 'The mail provider reported a delivery problem.',
    cancelled: 'This scheduled message was cancelled.',
    scheduled: 'This message is scheduled.',
    draft: 'This message needs review before it can be sent.'
  };
  return statuses[state] ?? 'The message outcome is unavailable.';
}
