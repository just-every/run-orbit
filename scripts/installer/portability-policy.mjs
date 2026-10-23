// Orbit's local archive uses Base portability with Orbit's own data policy:
// operator sessions, sign-in proofs and provider bindings (identity_*), rate
// limits, collaborator authority, delegation and mail-capture credentials stay
// with an installation, as in the Records archive.
export default {
 product: 'just-every/sales-orbit',
 excludeTables: ['sessions', 'magic_links', 'owner_bootstrap', 'sample_seed_runs', 'public_rate_limits', 'auth_rate_limits', 'runtime_controls', 'record_erasure_signals', 'access_write_guards', 'access_invitations', 'access_grants', 'access_form_authorities', 'slack_action_tokens', 'slack_credentials', 'capture_credentials', 'capture_oauth', 'capture_locks', 'ik_%', 'crm_import_%', 'delegation_%', 'archive_%', 'identity_%'],
 derivedTables: ['record_search', 'timeline_search', 'record_search_fields'],
 // Migrations seed these rows in every empty database; the archive's rows replace them.
 replaceableTables: ['graph_workspace_epochs', 'schema_types', 'pipelines', 'forecast_source_clock'],
 secretColumns: { signal_sources: ['secret_ciphertext'] },
 // Older valid archives may still contain schedules. Strip that installation-local
 // approval in staging, after integrity validation and before atomic publication.
 async validateStaged({ db, tables }) {
  if(tables.sales_dashboards)await db.prepare(`UPDATE "${tables.sales_dashboards.replaceAll('"','""')}" SET authority=0`).run();
  if(tables.sales_dashboard_schedules)await db.prepare(`UPDATE "${tables.sales_dashboard_schedules.replaceAll('"','""')}" SET state='paused'`).run();
  if(tables.slack_installation){const quoted='"'+tables.slack_installation.replaceAll('"','""')+'"';await db.prepare(`UPDATE ${quoted} SET state='disconnected',error='Archive restored; reconnect Slack credentials'`).run();}
  if(tables.slack_channels)await db.prepare(`UPDATE "${tables.slack_channels.replaceAll('"','""')}" SET enabled=0`).run();
  if(tables.slack_mappings)await db.prepare(`UPDATE "${tables.slack_mappings.replaceAll('"','""')}" SET revoked_at=COALESCE(revoked_at,?)`).bind(new Date().toISOString()).run();
  if(tables.slack_deletions)await db.prepare(`UPDATE "${tables.slack_deletions.replaceAll('"','""')}" SET state='held',error='Restored deletion needs administrator confirmation' WHERE state<>'deleted'`).run();
  const table = tables.outbound_messages;
  if (!table) return; // A supported archive predating outbound mail has no approval to strip.
  const quoted = '"' + table.replaceAll('"', '""') + '"';
  await db.prepare(`UPDATE ${quoted} SET state='cancelled',failure='Archive transfer requires fresh review and approval before sending' WHERE state='scheduled'`).run();
 },
 requiredConfiguration: ['OWNER_EMAIL', 'SESSION_SECRET', 'SETUP_TOKEN'],
 // Dev personas are real operators in local dev only; an archive carries them suspended.
 exportRow: (table, row) => {
  if (table === 'sales_dashboards') return {...row,authority:0};
  if (table === 'sales_dashboard_schedules') return {...row,state:'paused'};
  if (table === 'operators' && typeof row.email === 'string' && row.email.toLowerCase().endsWith('@dev.localhost')) return { ...row, status: 'removed' };
  // Content/history travel; an installation's approval to dispatch later does not.
  if (table === 'outbound_messages' && row.state === 'scheduled') return { ...row, state: 'cancelled', failure: 'Archive transfer requires fresh review and approval before sending' };
  return row;
 },
};

// booking_activity_ids is durable domain data; its timeline FK cascades contact erasure.
