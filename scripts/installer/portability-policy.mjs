// Orbit's local archive uses Base portability with Orbit's own data policy:
// operator sessions, sign-in proofs and provider bindings (identity_*), rate
// limits, collaborator authority, delegation and mail-capture credentials stay
// with an installation, as in the Records archive.
export default {
 product: 'just-every/sales-orbit',
 excludeTables: ['bs_%', 'agent_door_%', 'orbit_agent_%', 'orbit_native_changes', 'api_credentials', 'call_credentials', 'sessions', 'magic_links', 'owner_bootstrap', 'sample_seed_runs', 'public_rate_limits', 'auth_rate_limits', 'runtime_controls', 'record_erasure_signals', 'access_write_guards', 'access_invitations', 'access_grants', 'access_form_authorities', 'record_owner_reviews', 'slack_action_tokens', 'slack_credentials', 'capture_credentials', 'capture_oauth', 'capture_locks', 'ik_%', 'crm_import_%', 'delegation_%', 'archive_%', 'identity_%'],
 derivedTables: ['record_search', 'timeline_search', 'record_search_fields'],
 // Migrations seed these rows in every empty database; the archive's rows replace them.
 replaceableTables: ['graph_workspace_epochs', 'schema_types', 'pipelines', 'forecast_source_clock','workflow_journal_metadata'],
 secretColumns: { signal_sources: ['secret_ciphertext'] },
 // Older valid archives may still contain schedules. Strip that installation-local
 // approval in staging, after integrity validation and before atomic publication.
 async validateStaged({ db, tables }) {
  if(await db.prepare('SELECT 1 FROM api_credentials LIMIT 1').first())throw new Error('Local restore requires an installation without API credentials; they never travel or regain authority.');
  if(tables.api_credentials)await db.prepare('DELETE FROM "'+tables.api_credentials.replaceAll('"','""')+'"').run();
  if(tables.call_credentials)await db.prepare('DELETE FROM "'+tables.call_credentials.replaceAll('"','""')+'"').run();
  if(tables.record_mail_outbound_messages)await db.prepare(`UPDATE "${tables.record_mail_outbound_messages.replaceAll('"','""')}" SET state='cancelled',failure='Archive transfer requires fresh review and approval before sending' WHERE state IN('draft','scheduled','queued')`).run();
  if(tables.record_mail_drafts)await db.prepare(`UPDATE "${tables.record_mail_drafts.replaceAll('"','""')}" SET is_stale=1,stale_reason='Archive transfer requires fresh review'`).run();
  if(tables.ownership_batches)await db.prepare(`UPDATE "${tables.ownership_batches.replaceAll('"','""')}" SET state='held'`).run();
  if(tables.sales_dashboards)await db.prepare(`UPDATE "${tables.sales_dashboards.replaceAll('"','""')}" SET authority=0`).run();
  if(tables.sales_dashboard_schedules)await db.prepare(`UPDATE "${tables.sales_dashboard_schedules.replaceAll('"','""')}" SET state='paused'`).run();
  if(tables.slack_installation){const quoted='"'+tables.slack_installation.replaceAll('"','""')+'"';await db.prepare(`UPDATE ${quoted} SET state='disconnected',error='Archive restored; reconnect Slack credentials'`).run();}
  if(tables.slack_channels)await db.prepare(`UPDATE "${tables.slack_channels.replaceAll('"','""')}" SET enabled=0`).run();
  if(tables.slack_mappings)await db.prepare(`UPDATE "${tables.slack_mappings.replaceAll('"','""')}" SET revoked_at=COALESCE(revoked_at,?)`).bind(new Date().toISOString()).run();
  if(tables.slack_deletions)await db.prepare(`UPDATE "${tables.slack_deletions.replaceAll('"','""')}" SET state='held',error='Restored deletion needs administrator confirmation' WHERE state<>'deleted'`).run();
  if(tables.workflow_versions)await db.prepare(`UPDATE "${tables.workflow_versions.replaceAll('"','""')}" SET status='paused',preview_id=NULL,preview_json=NULL WHERE status IN('active','needs_reactivation')`).run();
  if(tables.workflow_runs)await db.prepare(`UPDATE "${tables.workflow_runs.replaceAll('"','""')}" SET status='stopped',reason='Archive restored; fresh activation required' WHERE status NOT IN('completed','undone')`).run();
  if(tables.workflow_approvals)await db.prepare(`UPDATE "${tables.workflow_approvals.replaceAll('"','""')}" SET status='expired' WHERE status='pending'`).run();
  const table = tables.outbound_messages;
  if (!table) return; // A supported archive predating outbound mail has no approval to strip.
  const quoted = '"' + table.replaceAll('"', '""') + '"';
  await db.prepare(`UPDATE ${quoted} SET state='cancelled',failure='Archive transfer requires fresh review and approval before sending' WHERE state='scheduled'`).run();
 },
 requiredConfiguration: ['OWNER_EMAIL', 'SESSION_SECRET', 'SETUP_TOKEN'],
 // Dev personas are real operators in local dev only; an archive carries them suspended.
 exportRow: (table, row) => {
  if(table==='workflow_versions')return {...row,status:'paused',preview_id:null,preview_json:null};
  if(table==='workflow_runs'&&!['completed','undone'].includes(row.status))return {...row,status:'stopped',reason:'Archive transfer requires fresh activation'};
  if(table==='workflow_approvals'&&row.status==='pending')return {...row,status:'expired'};
  if(table==='record_mail_outbound_messages'&&['draft','scheduled','queued'].includes(row.state))return {...row,state:'cancelled',failure:'Archive transfer requires fresh review and approval before sending'};
  if(table==='record_mail_drafts')return {...row,is_stale:1,stale_reason:'Archive transfer requires fresh review'};
  if (table === 'ownership_batches') return {...row,state:'held'};
  if (table === 'sales_dashboards') return {...row,authority:0};
  if (table === 'sales_dashboard_schedules') return {...row,state:'paused'};
  if (table === 'operators' && typeof row.email === 'string' && row.email.toLowerCase().endsWith('@dev.localhost')) return { ...row, status: 'removed' };
  // Content/history travel; an installation's approval to dispatch later does not.
  if (table === 'outbound_messages' && row.state === 'scheduled') return { ...row, state: 'cancelled', failure: 'Archive transfer requires fresh review and approval before sending' };
  return row;
 },
};
