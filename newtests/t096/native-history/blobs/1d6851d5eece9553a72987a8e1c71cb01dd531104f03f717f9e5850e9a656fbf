import { AuditRepository } from "./repository";

export class AuditService {
  constructor(private readonly repository: AuditRepository) {}

  async ensureEntry(input: Parameters<AuditRepository["ensureEntry"]>[0]): Promise<void> {
    await this.repository.ensureEntry(input);
  }
}
