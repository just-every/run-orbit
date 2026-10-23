-- OUT-017: additive storage preserves every native and owner-added column.
CREATE TABLE record_mail_drafts (
 id TEXT PRIMARY KEY,opportunity_id TEXT REFERENCES opportunities(id),recommendation_id TEXT REFERENCES recommendations(id),
 author_id TEXT NOT NULL REFERENCES operators(id),recipient_contact_id TEXT REFERENCES contacts(id) ON DELETE CASCADE,
 recipient_email TEXT NOT NULL,subject TEXT NOT NULL,body TEXT NOT NULL,revision INTEGER NOT NULL,
 is_stale INTEGER NOT NULL DEFAULT 0,stale_reason TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,
 library_selection_json TEXT NOT NULL DEFAULT '{}',merge_review_json TEXT
);
CREATE TABLE record_mail_outbound_messages (
 id TEXT PRIMARY KEY,draft_id TEXT REFERENCES record_mail_drafts(id) ON DELETE CASCADE,revision INTEGER NOT NULL,
 opportunity_id TEXT REFERENCES opportunities(id),operator_id TEXT NOT NULL REFERENCES operators(id),
 contact_id TEXT REFERENCES contacts(id) ON DELETE CASCADE,recipient_email TEXT NOT NULL,subject TEXT NOT NULL,body TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('draft','scheduled','queued','reconciling','accepted','delivered','bounced','failed','cancelled','delivery-unknown')),
 provider_message_id TEXT,failure TEXT,settlement_id TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,
 idempotency_key TEXT NOT NULL UNIQUE,message_id TEXT NOT NULL UNIQUE,reference_ids TEXT NOT NULL DEFAULT '',
 scheduled_at TEXT,next_attempt_at TEXT,attempt_count INTEGER NOT NULL DEFAULT 0,approved_at TEXT NOT NULL,claimed_at TEXT,first_attempt_at TEXT,
 render_snapshot_json TEXT,UNIQUE(draft_id,revision)
);
CREATE INDEX record_mail_outbound_due ON record_mail_outbound_messages(state,next_attempt_at,scheduled_at);
CREATE INDEX record_mail_outbound_contact ON record_mail_outbound_messages(contact_id,created_at);
CREATE TABLE record_mail_draft_opt_out (
 draft_id TEXT PRIMARY KEY REFERENCES record_mail_drafts(id) ON DELETE CASCADE,
 choice TEXT NOT NULL CHECK(choice IN('relationship','transactional','added')),updated_by TEXT NOT NULL,updated_at TEXT NOT NULL
);
CREATE TABLE record_mail_outbound_message_opt_out (
 message_id TEXT PRIMARY KEY REFERENCES record_mail_outbound_messages(id) ON DELETE CASCADE,
 carries INTEGER NOT NULL CHECK(carries IN(0,1)),marking TEXT CHECK(marking IN('relationship','transactional','added','transport'))
);
CREATE TABLE record_mail_outbound_opt_out_capabilities (
 token TEXT PRIMARY KEY CHECK(length(token)=64 AND token NOT GLOB '*[^a-f0-9]*'),
 message_id TEXT NOT NULL UNIQUE REFERENCES record_mail_outbound_messages(id) ON DELETE CASCADE,
 contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,origin TEXT NOT NULL,created_at TEXT NOT NULL
);
CREATE TABLE record_mail_context (
 draft_id TEXT PRIMARY KEY REFERENCES record_mail_drafts(id) ON DELETE CASCADE,
 origin_type TEXT NOT NULL CHECK(origin_type IN('contact','company','opportunity')),origin_id TEXT NOT NULL,
 history_opportunity_id TEXT REFERENCES opportunities(id) ON DELETE SET NULL
);
CREATE TABLE record_mail_obligations (
 message_id TEXT PRIMARY KEY REFERENCES record_mail_outbound_messages(id) ON DELETE CASCADE,
 contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
 operator_id TEXT NOT NULL REFERENCES operators(id),opened_at TEXT NOT NULL,due_at TEXT NOT NULL,
 closed_at TEXT,closed_reason TEXT
);
CREATE INDEX record_mail_obligation_due ON record_mail_obligations(operator_id,closed_at,due_at);
CREATE VIEW outbound_delivery_budget AS
 SELECT id,operator_id,claimed_at FROM outbound_messages UNION ALL SELECT id,operator_id,claimed_at FROM record_mail_outbound_messages;
CREATE TRIGGER record_mail_stop_contact AFTER UPDATE OF contactability,email ON contacts
 WHEN NEW.contactability='do_not_contact' OR lower(trim(COALESCE(NEW.email,'')))<>lower(trim(COALESCE(OLD.email,''))) BEGIN
 UPDATE record_mail_drafts SET is_stale=1,stale_reason='Recipient permission or address changed',updated_at=NEW.updated_at WHERE recipient_contact_id=NEW.id;
 UPDATE record_mail_outbound_messages SET state='cancelled',failure='Recipient permission or address changed',updated_at=NEW.updated_at WHERE contact_id=NEW.id AND state IN('draft','scheduled','queued');
END;
CREATE TRIGGER record_mail_setting_changed AFTER UPDATE ON opt_out_settings WHEN NEW.message_type='one_to_one' BEGIN
 UPDATE record_mail_drafts SET is_stale=1,stale_reason='Opt-out setting changed',updated_at=NEW.updated_at WHERE NOT EXISTS(SELECT 1 FROM record_mail_outbound_messages m WHERE m.draft_id=record_mail_drafts.id AND m.revision=record_mail_drafts.revision);
END;
CREATE TRIGGER record_mail_setting_created AFTER INSERT ON opt_out_settings WHEN NEW.message_type='one_to_one' BEGIN
 UPDATE record_mail_drafts SET is_stale=1,stale_reason='Opt-out setting changed',updated_at=NEW.updated_at WHERE NOT EXISTS(SELECT 1 FROM record_mail_outbound_messages m WHERE m.draft_id=record_mail_drafts.id AND m.revision=record_mail_drafts.revision);
END;
-- A genuine customer stop acts on both mail stores, irrespective of deal links.
CREATE TRIGGER record_mail_signal_stop AFTER INSERT ON signal_links WHEN NEW.record_type='contact'
 AND EXISTS(SELECT 1 FROM signals WHERE id=NEW.signal_id AND type IN('email.replied','meeting.booked','email.unsubscribed','email.bounced')) BEGIN
 UPDATE record_mail_drafts SET is_stale=1,stale_reason='Customer stop event',updated_at=NEW.linked_at WHERE recipient_contact_id=NEW.record_id;
 UPDATE record_mail_outbound_messages SET state='cancelled',failure='Customer stop event',updated_at=NEW.linked_at WHERE contact_id=NEW.record_id AND state='scheduled';
 UPDATE record_mail_obligations SET closed_at=NEW.linked_at,closed_reason='Customer response or delivery problem' WHERE contact_id=NEW.record_id AND closed_at IS NULL AND EXISTS(SELECT 1 FROM signals WHERE id=NEW.signal_id AND type IN('email.replied','meeting.booked'));
END;
CREATE TRIGGER record_mail_later_native_send AFTER UPDATE OF state ON outbound_messages WHEN NEW.state='accepted' AND OLD.state<>'accepted' BEGIN
 UPDATE record_mail_obligations SET closed_at=NEW.updated_at,closed_reason='Later accepted message' WHERE contact_id=NEW.contact_id AND closed_at IS NULL;
END;
CREATE TRIGGER record_mail_notify_state AFTER UPDATE OF state ON record_mail_outbound_messages
 WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import')) AND NEW.state<>OLD.state AND NEW.state IN('accepted','failed','bounced','delivery-unknown','reconciling') BEGIN
 INSERT OR IGNORE INTO notifications(id,operator_id,opportunity_id,event_key,kind,message,created_at)
 SELECT lower(hex(randomblob(16))),NEW.operator_id,NEW.opportunity_id,'record-mail:'||NEW.id||':'||NEW.state,'message.'||NEW.state,'Message '||NEW.state||' · '||COALESCE(c.name,c.email,'Contact'),NEW.updated_at FROM contacts c LEFT JOIN opportunities o ON o.id=NEW.opportunity_id WHERE c.id=NEW.contact_id AND EXISTS(SELECT 1 FROM operators sender WHERE sender.id=NEW.operator_id AND sender.status='active' AND NOT EXISTS(SELECT 1 FROM access_collaborators a WHERE a.operator_id=sender.id));
END;
CREATE TRIGGER record_mail_stop_deal AFTER UPDATE OF stage_id,lifecycle ON opportunities
 WHEN NEW.stage_id<>OLD.stage_id OR NEW.lifecycle<>OLD.lifecycle BEGIN
 UPDATE record_mail_outbound_messages SET state='cancelled',failure='Deal stage or lifecycle changed',updated_at=NEW.updated_at WHERE opportunity_id=NEW.id AND state IN('draft','scheduled','queued');
 UPDATE record_mail_drafts SET is_stale=1,stale_reason='Deal stage or lifecycle changed',updated_at=NEW.updated_at WHERE opportunity_id=NEW.id;
END;
CREATE TRIGGER record_mail_contact_context AFTER UPDATE OF name,job_title,company_id,timezone ON contacts BEGIN
 UPDATE record_mail_drafts SET is_stale=1,stale_reason='Recipient context changed',updated_at=NEW.updated_at WHERE recipient_contact_id=NEW.id;
END;
CREATE TRIGGER record_mail_company_context AFTER UPDATE OF name,primary_domain ON companies BEGIN
 UPDATE record_mail_drafts SET is_stale=1,stale_reason='Company context changed',updated_at=NEW.updated_at WHERE recipient_contact_id IN(SELECT id FROM contacts WHERE company_id=NEW.id);
END;
CREATE TRIGGER record_mail_evidence_context AFTER INSERT ON signal_links WHEN NEW.record_type='contact'
 AND EXISTS(SELECT 1 FROM signals WHERE id=NEW.signal_id AND type NOT LIKE '%auto_replied' AND type NOT LIKE '%:test') BEGIN
 UPDATE record_mail_drafts SET is_stale=1,stale_reason='Customer evidence changed',updated_at=NEW.linked_at WHERE recipient_contact_id=NEW.record_id;
END;
-- One delivery identity across both stores; duplicate claims cannot reach the provider twice.
CREATE TRIGGER record_mail_claim_identity BEFORE INSERT ON record_mail_outbound_messages
 WHEN EXISTS(SELECT 1 FROM outbound_messages WHERE id=NEW.id OR idempotency_key=NEW.idempotency_key OR message_id=NEW.message_id) BEGIN SELECT RAISE(IGNORE); END;
CREATE TRIGGER native_mail_claim_identity BEFORE INSERT ON outbound_messages
 WHEN EXISTS(SELECT 1 FROM record_mail_outbound_messages WHERE id=NEW.id OR idempotency_key=NEW.idempotency_key OR message_id=NEW.message_id) BEGIN SELECT RAISE(IGNORE); END;
CREATE TRIGGER record_mail_draft_identity BEFORE INSERT ON record_mail_drafts
 WHEN EXISTS(SELECT 1 FROM drafts WHERE id=NEW.id) BEGIN SELECT RAISE(ABORT,'Draft identity already exists'); END;
CREATE TRIGGER native_mail_draft_identity BEFORE INSERT ON drafts
 WHEN EXISTS(SELECT 1 FROM record_mail_drafts WHERE id=NEW.id) BEGIN SELECT RAISE(ABORT,'Draft identity already exists'); END;
