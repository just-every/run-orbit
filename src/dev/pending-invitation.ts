/**
 * Local sign-in stands in for opening the emailed invitation: choosing a person who was invited as a collaborator
 * accepts their pending invitation, the same two writes Orbit's own acceptance makes (the invitation is marked accepted,
 * then its profile becomes an active membership). Only the dev-key-gated persona chooser reaches this; a hosted
 * installation never imports the dev layer, and there acceptance still needs the invitation link's token.
 */
export async function acceptPendingInvitations(db: D1Database, operatorId: string) {
  const now = new Date().toISOString();
  const pending = (await db.prepare(
    "SELECT i.id,i.workspace_id,i.role FROM access_invitations i JOIN operators o ON lower(o.email)=lower(i.email) WHERE o.id=? AND EXISTS(SELECT 1 FROM access_collaborators WHERE operator_id=o.id) AND i.accepted_by IS NULL AND i.revoked_at IS NULL AND i.expires_at>? ORDER BY i.created_at",
  ).bind(operatorId, now).all<{ id: string; workspace_id: string; role: string }>()).results;
  if (!pending.length) return;
  await db.batch(pending.flatMap(invitation => [
    db.prepare('UPDATE access_invitations SET accepted_by=? WHERE id=? AND accepted_by IS NULL AND revoked_at IS NULL').bind(operatorId, invitation.id),
    db.prepare("INSERT INTO access_memberships(workspace_id,operator_id,role,status,created_at) VALUES(?,?,?,'active',?) ON CONFLICT(workspace_id,operator_id) DO UPDATE SET role=excluded.role,status='active'").bind(invitation.workspace_id, operatorId, invitation.role, now),
  ]));
}
