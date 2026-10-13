-- Explicit operator review is an operator action, not a source identity.
UPDATE timeline_entries SET actor_type='operator',source='operator.review'
WHERE kind='signal.recorded' AND actor_type='source'
 AND EXISTS(SELECT 1 FROM operators WHERE id=timeline_entries.actor_id)
 AND NOT EXISTS(SELECT 1 FROM signal_sources WHERE id=timeline_entries.actor_id);
