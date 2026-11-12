-- Native undo and duplicate reconciliation also delete contacts. Withdraw provider
-- staging only in the existing explicit privacy erasure transaction.
DROP TRIGGER crm_import_hubspot_erasure;
