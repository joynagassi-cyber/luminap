-- AUDIT ENRICHED
ALTER TABLE audit_entries ADD COLUMN IF NOT EXISTS before_state JSONB;
ALTER TABLE audit_entries ADD COLUMN IF NOT EXISTS after_state JSONB;
ALTER TABLE audit_entries ADD COLUMN IF NOT EXISTS actor_role_at_time TEXT;
ALTER TABLE audit_entries ALTER COLUMN transaction_id DROP NOT NULL;

-- TRANSACTIONS: add reversalOfId
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS reversal_of_id TEXT REFERENCES transactions(id);
CREATE INDEX IF NOT EXISTS idx_transactions_reversal_of_id ON transactions(reversal_of_id);