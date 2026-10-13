/** Commercial identity keys retain plus tags and dots: distinct mailboxes must not merge. */
export function normalizeCommercialEmail(value: string): string {
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("A valid commercial contact email is required");
  }
  return email;
}

/** Missing email is a valid contact; it is never an empty identity key. */
export function commercialEmailKey(value: string | null | undefined): string | null {
  return value == null || value.trim() === "" ? null : normalizeCommercialEmail(value);
}
