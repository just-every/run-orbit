export class HealthRepository {
  constructor(private readonly binding: D1Database) {}

  async checkDatabase(): Promise<void> {
    await this.binding.prepare("SELECT COUNT(*) AS count FROM workspace_settings").first();
  }
}
