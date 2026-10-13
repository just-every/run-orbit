import { createId } from '../../shared/ids';

// Defaults the owner reviews at /setup before first-run setup is complete. The name is only a stored stand-in: /setup
// asks for the real one, and fills the time zone from the owner's browser.
export const workspaceDefaults = { name: 'Your business', timezone: 'UTC', currency: 'USD', stages: ['New', 'Qualified', 'Proposal'] };

/**
 * One INSERT claims the first owner: the owner_bootstrap trigger creates the
 * owner operator, workspace settings and stages atomically, and refuses a
 * workspace that already has any of them (the claim is then already taken).
 */
export function bootstrapStatement(db: D1Database, input: { ownerId: string; email: string; displayName: unknown; now: number }) {
  const name = typeof input.displayName === 'string' && input.displayName.trim() ? input.displayName.trim().slice(0, 200) : 'Owner';
  const created = new Date(input.now).toISOString();
  const stages = workspaceDefaults.stages.map((stage, index) => ({ id: createId(input.now + index), name: stage }));
  return db.prepare(`INSERT INTO owner_bootstrap (id, owner_id, email, display_name, workspace_name, timezone, currency, stages_json, created_at)
    VALUES ('initial-owner', ?, ?, ?, ?, ?, ?, ?, ?)`).bind(input.ownerId, input.email.trim().toLowerCase(), name, workspaceDefaults.name,
    workspaceDefaults.timezone, workspaceDefaults.currency, JSON.stringify(stages), created);
}
