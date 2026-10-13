import { createDependencies } from './dependencies';
import { SampleDataRepository, SampleDataService } from '../fixtures/sample-data';
import { systemClock } from '../../src/core/platform/clock';
export function createTestDependencies(database: D1Database) {
 const deps=createDependencies(database);
 return {...deps,sampleData:new SampleDataService(new SampleDataRepository(database),deps,systemClock)};
}
