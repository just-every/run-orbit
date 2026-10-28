import type {ForecastSnapshot} from '../../src/core/features/forecast/types';

export interface ForecastJourneyProof {
  prior: ForecastSnapshot;
  unrelated: ForecastSnapshot;
  dealId: string;
  contactId: string;
  overrideReason: string;
}
