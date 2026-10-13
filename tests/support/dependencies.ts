import { createDependencies as createAppDependencies } from '../../src/core/app/dependencies';
import { systemClock, type Clock } from '../../src/core/platform/clock';
import { testAuth } from './test-auth';

/** The application's dependencies plus test-only operators and sessions. */
export function createDependencies(database: D1Database, clock: Clock = systemClock) {
  return { ...createAppDependencies(database, clock), auth: testAuth(database, clock) };
}
