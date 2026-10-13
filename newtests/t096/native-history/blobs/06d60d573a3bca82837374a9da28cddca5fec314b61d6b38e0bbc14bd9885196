-- Provider activity must name a durable source just like signed signal activity.
INSERT OR IGNORE INTO signal_sources(id,name,type,enabled,created_at,updated_at)
SELECT 'sendgrid-events','SendGrid delivery events','mail_provider',1,
 strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE EXISTS(SELECT 1 FROM timeline_entries WHERE actor_type='source' AND actor_id IS NULL AND source='sendgrid' AND kind LIKE 'provider.%');
UPDATE timeline_entries SET actor_id='sendgrid-events'
WHERE actor_type='source' AND actor_id IS NULL AND source='sendgrid' AND kind LIKE 'provider.%';
