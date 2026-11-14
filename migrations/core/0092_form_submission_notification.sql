-- A native form intake creates its own submission-scoped recipient notice.
-- Its deal creation or return to NOW must not duplicate that recipient's notice.
-- The marker is installed and removed inside that intake's atomic D1 batch.
-- Every other notification kind and every ordinary NOW event stays unchanged.
CREATE TRIGGER notification_skip_form_now BEFORE INSERT ON notifications
WHEN NEW.kind='opportunity.now'
 AND EXISTS(SELECT 1 FROM runtime_controls WHERE name='form_submission' AND value=NEW.operator_id)
BEGIN
 SELECT RAISE(IGNORE);
END;
