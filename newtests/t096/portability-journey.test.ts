import {test} from 'node:test';
import {populatedPortabilityJourney} from './portability-sanity-custody';

test('DATA-001 DATA-002 DATA-003 populated Records and shipped CLI portability preserves current sales history through restart, requires fresh authority and keeps erasure effective',populatedPortabilityJourney);
