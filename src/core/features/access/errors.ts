import type { DomainErrorCode } from '../../shared/expansion-contracts';
export class AccessError extends Error {
  constructor(readonly code: DomainErrorCode, message: string) { super(message); }
  get status() { return this.code === 'permission' ? 403 : this.code === 'validation' ? 400 : this.code === 'prerequisite' ? 503 : 409; }
}
export function deny(message = 'This operation is not permitted.') : never { throw new AccessError('permission', message); }
export function check(value: unknown, message: string): asserts value { if (!value) throw new AccessError('validation', message); }
