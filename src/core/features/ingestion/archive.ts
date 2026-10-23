import type {ArchiveTable} from '../records/archive-schema';
/** Earlier archives precede the additive booking identity model. */
export const preBookingCatalog=(catalog:ArchiveTable[])=>catalog.filter(table=>table.name!=='booking_activity_ids');
