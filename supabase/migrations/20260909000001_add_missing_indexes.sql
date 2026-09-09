-- Migration: Add missing indexes for query performance
-- Covers tables created in migrations 0000-0039 that lack indexes on frequently queried columns.

-- ====================
-- profiles
-- ====================
CREATE INDEX IF NOT EXISTS idx_profiles_org_id ON profiles(org_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_name ON profiles(last_name, first_name);

-- ====================
-- transactions
-- ====================
-- org_id is the primary RLS filter on this high-volume table; missing it was a major gap.
CREATE INDEX IF NOT EXISTS idx_transactions_org_id ON transactions(org_id);
-- Composite for queries that filter by org + status (used by resource.list)
CREATE INDEX IF NOT EXISTS idx_transactions_org_status ON transactions(org_id, status);
-- Composite for account detail queries: SELECT * FROM transactions WHERE source_caisse_id = ? AND status = ?
CREATE INDEX IF NOT EXISTS idx_transactions_source_caisse_id ON transactions(source_caisse_id);
-- Composite for cotisation lookups
CREATE INDEX IF NOT EXISTS idx_transactions_cotisation_org ON transactions(cotisation_id, org_id);

-- ====================
-- notifications
-- ====================
-- org_id is required for every notification query (RLS scope + filtering)
CREATE INDEX IF NOT EXISTS idx_notifications_org_id ON notifications(org_id);
-- Unread notifications are fetched frequently; this composite supports the common WHERE org_id=? AND is_read=false
CREATE INDEX IF NOT EXISTS idx_notifications_org_unread ON notifications(org_id, is_read);

-- ====================
-- role_assignments
-- ====================
CREATE INDEX IF NOT EXISTS idx_role_assignments_org_id ON role_assignments(org_id);
-- Support lookup by user session
CREATE INDEX IF NOT EXISTS idx_role_assignments_session ON role_assignments(session_id);

-- ====================
-- events
-- ====================
-- org_id + type is a common filter (e.g., listing cultes for an org)
CREATE INDEX IF NOT EXISTS idx_events_org_id ON events(org_id);
CREATE INDEX IF NOT EXISTS idx_events_org_type ON events(org_id, type);

-- ====================
-- report_definitions
-- ====================
CREATE INDEX IF NOT EXISTS idx_report_definitions_org_id ON report_definitions(org_id);
CREATE INDEX IF NOT EXISTS idx_report_definitions_saved_by ON report_definitions(saved_by);

-- ====================
-- form_definitions
-- ====================
CREATE INDEX IF NOT EXISTS idx_form_definitions_org_id ON form_definitions(org_id);

-- ====================
-- custom_field_definitions
-- ====================
CREATE INDEX IF NOT EXISTS idx_custom_field_definitions_org_id ON custom_field_definitions(org_id);
CREATE INDEX IF NOT EXISTS idx_custom_field_definitions_entity ON custom_field_definitions(entity_type, org_id);

-- ====================
-- audit_entries
-- ====================
CREATE INDEX IF NOT EXISTS idx_audit_entries_org_id ON audit_entries(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_entries_created_at ON audit_entries(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_entries_actor ON audit_entries(actor_id);

-- ====================
-- versements
-- ====================
-- Composite for account-level transaction queries
CREATE INDEX IF NOT EXISTS idx_versements_from_org ON versements(from_account_id, org_id);
-- Composite for date-range queries on a specific account
CREATE INDEX IF NOT EXISTS idx_versements_date_org ON versements(date, org_id);

-- ====================
-- members
-- ====================
-- org_id + status is the dominant query pattern for member lists
CREATE INDEX IF NOT EXISTS idx_members_org_status ON members(org_id, status);
-- Composite for searching by name within an org
CREATE INDEX IF NOT EXISTS idx_members_org_name ON members(org_id, last_name, first_name);

-- ====================
-- group_memberships
-- ====================
-- Composite for fetching all members of a group (common in group detail view)
CREATE INDEX IF NOT EXISTS idx_gm_group_member ON group_memberships(group_id, member_id);
-- Composite for fetching all groups of a member
CREATE INDEX IF NOT EXISTS idx_gm_member_group ON group_memberships(member_id, group_id);
