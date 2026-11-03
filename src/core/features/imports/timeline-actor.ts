import { nativeId } from './source';

const vendors: Record<string, string> = { hubspot: 'HubSpot', pipedrive: 'Pipedrive', csv: 'CSV' };

/** Import history has its own actor; it is not a connected signal source.
 * Earlier imports stored a null source actor. Interpret only that exact note
 * shape, bound to its original import namespace and stable source identity.
 * Keeping this on read also covers retained reviews, replay and archive restore.
 */
export function importTimelineActor(entry: {
  id: string;
  kind: string;
  actorType: string;
  actorId: string | null;
  source: string;
  payloadJson: string;
}): string | null {
  if (entry.kind !== 'import.note' || !Object.hasOwn(vendors, entry.source)) return null;
  if (entry.actorType !== 'import' && !(entry.actorType === 'source' && entry.actorId === null)) return null;
  const provenance = JSON.parse(entry.payloadJson)?.importSource;
  if (!provenance || provenance.vendor !== entry.source || typeof provenance.account !== 'string' ||
      !provenance.account.trim() || typeof provenance.sourceId !== 'string' || !provenance.sourceId) return null;
  const namespace = `orbit:${entry.source}:${provenance.account}`;
  if (entry.id !== nativeId(namespace, 'note', provenance.sourceId)) return null;
  if (entry.actorType === 'import' && entry.actorId !== namespace) return null;
  return `${provenance.account} (${vendors[entry.source]} import)`;
}
