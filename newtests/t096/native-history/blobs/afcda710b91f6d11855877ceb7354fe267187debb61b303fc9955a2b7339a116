import { HealthRepository } from "./repository";

export class HealthService {
  constructor(private readonly repository: HealthRepository) {}

  async check(): Promise<{ database: "ok" }> {
    await this.repository.checkDatabase();
    return { database: "ok" };
  }
}
