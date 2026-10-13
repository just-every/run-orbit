/** Both editions relate people to commercial work; role and primary policies stay local. */
export function assertCommercialRelationship(input: {
  contactId: string;
  opportunityId: string;
}, known: {
  contactIds: ReadonlySet<string>;
  opportunityIds: ReadonlySet<string>;
}): void {
  if (!input.contactId.trim() || !known.contactIds.has(input.contactId)) {
    throw new Error(`Unknown commercial contact: ${input.contactId}`);
  }
  if (!input.opportunityId.trim() || !known.opportunityIds.has(input.opportunityId)) {
    throw new Error(`Unknown commercial opportunity: ${input.opportunityId}`);
  }
}
