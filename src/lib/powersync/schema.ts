import { column, Schema, Table } from '@powersync/web';

// ============================================================
// SCHEMA POWER_SYNC - Généré depuis Supabase
// ============================================================

export const accounts = new Table(
  {
    // id column (text) is automatically included
    code: column.text,
    label: column.text,
    parent_id: column.text,
    type: column.text,
    created_at: column.text
  },
  { indexes: {} }
);

export const activity_log = new Table(
  {
    // id column (text) is automatically included
    action: column.text,
    actor_user_id: column.text,
    actor_type: column.text,
    target_type: column.text,
    target_id: column.text,
    related_ids: column.text,
    metadata: column.text,
    ip_address: column.text,
    user_agent: column.text,
    created_at: column.text
  },
  { indexes: {} }
);

export const admin_activations = new Table(
  {
    // id column (text) is automatically included
    user_id: column.text,
    code_id: column.text,
    activated_at: column.text,
    ip_address: column.text,
    user_agent: column.text
  },
  { indexes: {} }
);

export const admin_codes = new Table(
  {
    // id column (text) is automatically included
    code_hash: column.text,
    is_active: column.integer,
    associated_role_level: column.text,
    expires_at: column.text,
    created_at: column.text,
    created_by: column.text
  },
  { indexes: {} }
);

export const admin_group_subscriptions = new Table(
  {
    // id column (text) is automatically included
    user_id: column.text,
    group_id: column.text,
    created_at: column.text
  },
  { indexes: {} }
);

export const ai_cron_config = new Table(
  {
    // id column (text) is automatically included
    key: column.text,
    value: column.text
  },
  { indexes: {} }
);

export const ai_queue = new Table(
  {
    // id column (text) is automatically included
    task_type: column.text,
    payload: column.text,
    status: column.text,
    model_used: column.text,
    result: column.text,
    error: column.text,
    scheduled_at: column.text,
    retry_count: column.integer,
    max_retries: column.integer,
    created_at: column.text
  },
  { indexes: {} }
);

export const annonces = new Table(
  {
    // id column (text) is automatically included
    church_id: column.text,
    title: column.text,
    content: column.text,
    image_url: column.text,
    start_date: column.text,
    end_date: column.text,
    is_pinned: column.integer,
    is_active: column.integer,
    created_by: column.text,
    created_at: column.text,
    updated_at: column.text,
    type: column.text,
    summary: column.text,
    author_id: column.text,
    author_name: column.text,
    date: column.text,
    published_at: column.text,
    is_published: column.integer,
    views_count: column.integer,
    likes_count: column.integer,
    tags: column.text,
    category: column.text,
    status: column.text,
    notes: column.text,
    updated_by: column.text
  },
  { indexes: {} }
);

export const app_settings = new Table(
  {
    // id column (text) is automatically included
    key: column.text,
    data: column.text,
    updated_at: column.text
  },
  { indexes: {} }
);

export const app_themes = new Table(
  {
    // id column (text) is automatically included
    code: column.text,
    name: column.text,
    primary_color: column.text,
    secondary_color: column.text,
    success_color: column.text,
    warning_color: column.text,
    danger_color: column.text,
    background_color: column.text,
    card_color: column.text,
    font_family: column.text,
    font_size_base: column.integer,
    is_default: column.integer,
    created_by: column.text,
    created_at: column.text,
    updated_at: column.text
  },
  { indexes: {} }
);

export const approval_decisions = new Table(
  {
    // id column (text) is automatically included
    request_id: column.text,
    step_id: column.text,
    step_order: column.integer,
    decision: column.text,
    comment: column.text,
    decided_by: column.text,
    decided_at: column.text,
    delegated_to: column.text,
    decision_context: column.text
  },
  { indexes: {} }
);

export const approval_matrices = new Table(
  {
    // id column (text) is automatically included
    church_id: column.text,
    name: column.text,
    description: column.text,
    entity_type: column.text,
    is_active: column.integer,
    created_at: column.text,
    updated_at: column.text
  },
  { indexes: {} }
);

export const approval_matrix = new Table(
  {
    // id column (text) is automatically included
    min_amount: column.integer,
    max_amount: column.integer,
    required_roles: column.text,
    required_validations: column.integer
  },
  { indexes: {} }
);

export const approval_matrix_steps = new Table(
  {
    // id column (text) is automatically included
    matrix_id: column.text,
    step_order: column.integer,
    step_label: column.text,
    approver_type: column.text,
    approver_role_codes: column.text,
    approver_user_id: column.text,
    min_amount: column.text,
    max_amount: column.text,
    sla_hours: column.integer,
    escalation_role_code: column.text,
    requires_comment: column.integer,
    auto_approve_if_same_user: column.integer
  },
  { indexes: {} }
);

export const approval_notifications = new Table(
  {
    // id column (text) is automatically included
    request_id: column.text,
    recipient_id: column.text,
    type: column.text,
    title: column.text,
    body: column.text,
    is_read: column.integer,
    read_at: column.text,
    created_at: column.text
  },
  { indexes: {} }
);

export const approval_requests = new Table(
  {
    // id column (text) is automatically included
    church_id: column.text,
    matrix_id: column.text,
    entity_type: column.text,
    entity_id: column.text,
    entity_label: column.text,
    entity_amount: column.text,
    entity_data: column.text,
    status: column.text,
    current_step_order: column.integer,
    total_steps: column.integer,
    requested_by: column.text,
    requested_at: column.text,
    completed_at: column.text,
    priority: column.text,
    due_date: column.text
  },
  { indexes: {} }
);

export const approval_signatures = new Table(
  {
    // id column (text) is automatically included
    request_id: column.text,
    signed_by: column.text,
    signed_at: column.text,
    comment: column.text
  },
  { indexes: {} }
);

export const approvals = new Table(
  {
    // id column (text) is automatically included
    transaction_id: column.text,
    approver_id: column.text,
    role_used: column.text,
    decision: column.text,
    comment: column.text,
    decided_at: column.text,
    created_at: column.text,
    approver_name: column.text
  },
  { indexes: {} }
);

export const audit_logs = new Table(
  {
    // id column (text) is automatically included
    actor_id: column.text,
    actor_ip: column.text,
    actor_user_agent: column.text,
    action: column.text,
    entity_type: column.text,
    entity_id: column.text,
    old_value: column.text,
    new_value: column.text,
    metadata: column.text,
    occurred_at: column.text,
    old_data: column.text,
    new_data: column.text,
    role_used: column.text,
    device_id: column.text,
    ip_address: column.text
  },
  { indexes: {} }
);

export const audit_user_roles = new Table(
  {
    // id column (text) is automatically included
    user_role_id: column.text,
    actor_user_id: column.text,
    action: column.text,
    details: column.text,
    occurred_at: column.text
  },
  { indexes: {} }
);

export const backup_logs = new Table(
  {
    // id column (text) is automatically included
    backup_type: column.text,
    status: column.text,
    file_path: column.text,
    file_size_bytes: column.integer,
    checksum_sha256: column.text,
    gdrive_file_id: column.text,
    archive_year: column.integer,
    started_at: column.text,
    completed_at: column.text,
    error_message: column.text,
    verified_at: column.text,
    verification_result: column.text
  },
  { indexes: {} }
);

export const bank_reconciliations = new Table(
  {
    // id column (text) is automatically included
    bank_account_id: column.text,
    reconciliation_date: column.text,
    statement_balance: column.text,
    book_balance: column.text,
    difference: column.text,
    status: column.text,
    reconciled_by: column.text,
    created_at: column.text
  },
  { indexes: {} }
);

export const bible_bookmarks = new Table(
  {
    // id column (text) is automatically included
    user_id: column.text,
    verse_id: column.text,
    book_id: column.text,
    chapter: column.integer,
    verse: column.integer,
    version: column.text,
    verse_text: column.text,
    reference: column.text,
    collection_name: column.text,
    created_at: column.text
  },
  { indexes: {} }
);

export const bible_highlights = new Table(
  {
    // id column (text) is automatically included
    user_id: column.text,
    verse_id: column.text,
    book_id: column.text,
    chapter: column.integer,
    verse: column.integer,
    version: column.text,
    color: column.text,
    category: column.text,
    created_at: column.text
  },
  { indexes: {} }
);

export const bible_reading_daily_progress = new Table(
  {
    // id column (text) is automatically included
    user_id: column.text,
    church_id: column.text,
    subscription_id: column.text,
    day_index: column.integer,
    chapters_read: column.text,
    completed_at: column.text,
    created_at: column.text
  },
  { indexes: {} }
);

export const bible_reading_plan_subscriptions = new Table(
  {
    // id column (text) is automatically included
    user_id: column.text,
    church_id: column.text,
    plan_id: column.text,
    started_at: column.text,
    status: column.text,
    current_day: column.integer,
    last_processed_at: column.text,
    created_at: column.text,
    updated_at: column.text
  },
  { indexes: {} }
);

export const bible_reading_rewards = new Table(
  {
    // id column (text) is automatically included
    user_id: column.text,
    church_id: column.text,
    subscription_id: column.text,
    reward_type: column.text,
    reward_url: column.text,
    granted_at: column.text,
    created_at: column.text
  },
  { indexes: {} }
);

export const bible_search_history = new Table(
  {
    // id column (text) is automatically included
    user_id: column.text,
    church_id: column.text,
    query: column.text,
    result_count: column.integer,
    created_at: column.text
  },
  { indexes: {} }
);

export const bible_verse_annotations = new Table(
  {
    // id column (text) is automatically included
    user_id: column.text,
    church_id: column.text,
    book_id: column.text,
    chapter: column.integer,
    verse: column.integer,
    translation_id: column.text,
    type: column.text,
    color_hex: column.text,
    content: column.text,
    created_at: column.text,
    updated_at: column.text
  },
  { indexes: {} }
);

export const bilan_periods = new Table(
  {
    // id column (text) is automatically included
    church_id: column.text,
    year: column.integer,
    month: column.integer,
    status: column.text,
    sealed_at: column.text,
    sealed_by: column.text,
    seal_hash: column.text,
    total_income: column.text,
    total_expense: column.text,
    net_balance: column.text,
    category_breakdown: column.text,
    notes: column.text,
    created_at: column.text,
    updated_at: column.text
  },
  { indexes: {} }
);

export const budgets = new Table(
  {
    // id column (text) is automatically included
    church_id: column.text,
    notes: column.text,
    start_date: column.text,
    end_date: column.text,
    planned_amount: column.text,
    actual_amount: column.text,
    status: column.text,
    is_active: column.integer,
    created_at: column.text,
    updated_at: column.text,
    fiscal_year: column.integer,
    category_id: column.text,
    period: column.text,
    year: column.integer,
    month: column.integer,
    quarter: column.integer,
    is_approved: column.integer,
    approved_by: column.text,
    approved_at: column.text
  },
  { indexes: {} }
);

export const camps = new Table(
  {
    // id column (text) is automatically included
    group_id: column.text,
    name: column.text,
    description: column.text,
    start_date: column.text,
    end_date: column.text,
    event_id: column.text,
    budget_target: column.text,
    budget_actual: column.text,
    capacity: column.integer,
    registered_count: column.integer,
    theme_color: column.text,
    status: column.text,
    created_at: column.text,
    updated_at: column.text
  },
  { indexes: {} }
);

export const chat_messages = new Table(
  {
    // id column (text) is automatically included
    conversation_id: column.text,
    sender_id: column.text,
    content: column.text,
    type: column.text,
    attachment_url: column.text,
    read_by: column.text,
    is_edited: column.integer,
    reply_to_id: column.text,
    created_at: column.text,
    updated_at: column.text,
    encrypted_content: column.text,
    encryption_iv: column.text,
    is_encrypted: column.integer,
    attachment_type: column.text,
    attachment_size: column.integer
  },
  { indexes: {} }
);

export const child_safety_cards = new Table(
  {
    // id column (text) is automatically included
    member_id: column.text,
    medical_info: column.text,
    emergency_contact: column.text,
    allergies: column.text,
    blood_type: column.text,
    last_check_in: column.text,
    is_active: column.integer,
    created_at: column.text,
    updated_at: column.text
  },
  { indexes: {} }
);

export const children_programs = new Table(
  {
    // id column (text) is automatically included
    title: column.text,
    description: column.text,
    min_age: column.integer,
    max_age: column.integer,
    schedule: column.text,
    capacity: column.integer,
    status: column.text,
    created_at: column.text
  },
  { indexes: {} }
);

export const church_members = new Table(
  {
    // id column (text) is automatically included
    user_id: column.text,
    church_id: column.text,
    role: column.text,
    status: column.text,
    joined_at: column.text,
    created_at: column.text
  },
  { indexes: {} }
);

export const church_services = new Table(
  {
    // id column (text) is automatically included
    church_id: column.text,
    title: column.text,
    type: column.text,
    date: column.text,
    start_time: column.text,
    end_time: column.text,
    preacher: column.text,
    theme: column.text,
    bible_reference: column.text,
    notes: column.text,
    attendance_count: column.integer,
    offering_total: column.text,
    created_at: column.text,
    updated_at: column.text,
    men_count: column.integer,
    women_count: column.integer,
    children_count: column.integer
  },
  { indexes: {} }
);

export const churches = new Table(
  {
    // id column (text) is automatically included
    name: column.text,
    type: column.text,
    description: column.text,
    address: column.text,
    city: column.text,
    postal_code: column.text,
    phone: column.text,
    email: column.text,
    website: column.text,
    parent_church_id: column.text,
    federation_id: column.text,
    logo_url: column.text,
    is_active: column.integer,
    created_at: column.text,
    updated_at: column.text,
    slug: column.text
  },
  { indexes: {} }
);

export const circle_members = new Table(
  {
    // id column (text) is automatically included
    circle_id: column.text,
    member_id: column.text,
    role: column.text,
    joined_at: column.text,
    is_active: column.integer
  },
  { indexes: {} }
);

export const circles = new Table(
  {
    // id column (text) is automatically included
    church_id: column.text,
    name: column.text,
    description: column.text,
    type: column.text,
    leader_id: column.text,
    max_members: column.integer,
    meeting_day: column.text,
    meeting_time: column.text,
    location: column.text,
    is_active: column.integer,
    created_at: column.text,
    updated_at: column.text
  },
  { indexes: {} }
);

export const compliance_results = new Table(
  {
    // id column (text) is automatically included
    transaction_id: column.text,
    rule_id: column.text,
    rule_code: column.text,
    result: column.text,
    message: column.text,
    evaluated_at: column.text
  },
  { indexes: {} }
);

export const compliance_rules = new Table(
  {
    // id column (text) is automatically included
    code: column.text,
    label: column.text,
    legal_reference: column.text,
    rule_type: column.text,
    priority: column.integer,
    condition: column.text,
    action: column.text,
    active: column.integer,
    created_at: column.text,
    updated_at: column.text
  },
  { indexes: {} }
);

export const conversations = new Table(
  {
    // id column (text) is automatically included
    church_id: column.text,
    participant_ids: column.text,
    title: column.text,
    is_group: column.integer,
    last_message_at: column.text,
    last_message_preview: column.text,
    created_at: column.text,
    updated_at: column.text,
    is_pinned: column.integer,
    last_seen_at: column.text
  },
  { indexes: {} }
);

export const currencies = new Table(
  {
    // id column (text) is automatically included
    code: column.text,
    symbol: column.text,
    label: column.text,
    is_default: column.integer,
    created_at: column.text
  },
  { indexes: {} }
);

export const discipleship_programs = new Table(
  {
    // id column (text) is automatically included
    group_id: column.text,
    title: column.text,
    description: column.text,
    mentor_id: column.text,
    mentee_id: column.text,
    progress_percentage: column.integer,
    status: column.text,
    start_date: column.text,
    last_meeting_date: column.text,
    created_at: column.text,
    updated_at: column.text
  },
  { indexes: {} }
);

export const donations = new Table(
  {
    // id column (text) is automatically included
    church_id: column.text,
    donor_id: column.text,
    transaction_id: column.text,
    amount: column.text,
    currency: column.text,
    donation_type: column.text,
    payment_method: column.text,
    receipt_number: column.text,
    is_tax_deductible: column.integer,
    notes: column.text,
    donated_at: column.text,
    created_at: column.text
  },
  { indexes: {} }
);

export const donors = new Table(
  {
    // id column (text) is automatically included
    church_id: column.text,
    type: column.text,
    first_name: column.text,
    last_name: column.text,
    organization_name: column.text,
    display_name: column.text,
    email: column.text,
    phone: column.text,
    address: column.text,
    member_id: column.text,
    tax_id: column.text,
    wants_receipt: column.integer,
    receipt_delivery: column.text,
    donor_category: column.text,
    total_donated: column.text,
    donation_count: column.integer,
    avg_donation: column.text,
    is_active: column.integer,
    created_at: column.text,
    updated_at: column.text
  },
  { indexes: {} }
);

export const drive_files = new Table(
  {
    // id column (text) is automatically included
    entity_type: column.text,
    entity_id: column.text,
    r2_key: column.text,
    drive_folder_path: column.text,
    original_filename: column.text,
    mime_type: column.text,
    file_size_bytes: column.integer,
    checksum_sha256: column.text,
    uploaded_by: column.text,
    status: column.text,
    signature_ecdsa: column.text,
    sealed_at: column.text,
    sealed_by: column.text,
    encryption_key_id: column.text,
    metadata: column.text,
    created_at: column.text,
    updated_at: column.text,
    storage_provider: column.text,
    church_id: column.text
  },
  { indexes: {} }
);

export const event_attendances = new Table(
  {
    // id column (text) is automatically included
    event_id: column.text,
    member_id: column.text,
    guest_name: column.text,
    guest_phone: column.text,
    status: column.text,
    check_in_at: column.text,
    notes: column.text,
    created_at: column.text
  },
  { indexes: {} }
);

export const event_recurrence = new Table(
  {
    // id column (text) is automatically included
    frequency: column.text,
    interval: column.integer,
    by_day: column.text,
    by_month_day: column.text,
    end_date: column.text,
    occurrences_count: column.integer,
    created_at: column.text
  },
  { indexes: {} }
);

export const events = new Table(
  {
    // id column (text) is automatically included
    church_id: column.text,
    title: column.text,
    description: column.text,
    date: column.text,
    end_date: column.text,
    location: column.text,
    category: column.text,
    max_participants: column.integer,
    is_public: column.integer,
    registration_required: column.integer,
    image_url: column.text,
    created_by: column.text,
    created_at: column.text,
    updated_at: column.text,
    last_modified_at: column.text,
    last_modified_by: column.text,
    group_id: column.text,
    type: column.text,
    recurrence_id: column.text,
    manager_id: column.text,
    officiant_name: column.text,
    estimated_participants: column.integer,
    actual_participants: column.integer,
    estimated_budget: column.text,
    actual_budget: column.text,
    budget_account_id: column.text,
    status: column.text,
    color: column.text,
    notes: column.text,
    updated_by: column.text,
    max_seats: column.integer
  },
  { indexes: {} }
);

export const family_relationships = new Table(
  {
    // id column (text) is automatically included
    member_id: column.text,
    related_member_id: column.text,
    relationship_type: column.text,
    is_primary: column.integer,
    created_at: column.text,
    church_id: column.text
  },
  { indexes: {} }
);

export const fcm_tokens = new Table(
  {
    // id column (text) is automatically included
    user_id: column.text,
    token: column.text,
    church_id: column.text,
    platform: column.text,
    updated_at: column.text
  },
  { indexes: {} }
);

export const finance_transactions = new Table(
  {
    // id column (text) is automatically included
    church_id: column.text,
    type: column.text,
    amount: column.text,
    category_id: column.text,
    category_name: column.text,
    description: column.text,
    date: column.text,
    payment_method: column.text,
    reference: column.text,
    member_id: column.text,
    member_name: column.text,
    account_id: column.text,
    budget_id: column.text,
    attachment_url: column.text,
    notes: column.text,
    is_recurring: column.integer,
    recurring_frequency: column.text,
    status: column.text,
    validated_by: column.text,
    validated_at: column.text,
    created_at: column.text,
    updated_at: column.text,
    last_modified_at: column.text,
    last_modified_by: column.text,
    mission_id: column.text,
    fund_source_code: column.text,
    group_id: column.text,
    currency: column.text,
    exchange_rate: column.text,
    amount_base_currency: column.text,
    reference_number: column.text,
    tags: column.text,
    attachments: column.text,
    approved_by: column.text,
    approved_at: column.text,
    is_reconciled: column.integer,
    reconciled_at: column.text,
    reconciled_by: column.text
  },
  { indexes: {} }
);

export const financial_accounts = new Table(
  {
    // id column (text) is automatically included
    church_id: column.text,
    name: column.text,
    type: column.text,
    account_number: column.text,
    bank_name: column.text,
    balance: column.text,
    currency: column.text,
    is_default: column.integer,
    is_active: column.integer,
    created_at: column.text,
    updated_at: column.text,
    group_id: column.text,
    is_manual: column.integer,
    is_locked: column.integer
  },
  { indexes: {} }
);

export const fund_sources = new Table(
  {
    // id column (text) is automatically included
    code: column.text,
    label: column.text,
    requires_foreign_declaration: column.integer,
    requires_nif: column.integer,
    max_amount_cfa: column.integer,
    active: column.integer,
    created_at: column.text
  },
  { indexes: {} }
);

export const group_memberships = new Table(
  {
    // id column (text) is automatically included
    group_id: column.text,
    member_id: column.text,
    role: column.text,
    joined_at: column.text,
    is_active: column.integer,
    created_at: column.text,
    status: column.text
  },
  { indexes: {} }
);

export const group_projects = new Table(
  {
    // id column (text) is automatically included
    group_id: column.text,
    title: column.text,
    description: column.text,
    budget_target: column.integer,
    budget_spent: column.integer,
    start_date: column.text,
    end_date: column.text,
    status: column.text,
    created_at: column.text,
    updated_at: column.text
  },
  { indexes: {} }
);

export const group_secret_codes = new Table(
  {
    // id column (text) is automatically included
    group_id: column.text,
    role_type: column.text,
    code_hash: column.text,
    is_used: column.integer,
    used_by_user_id: column.text,
    used_at: column.text,
    created_at: column.text,
    raw_code: column.text
  },
  { indexes: {} }
);

export const groups = new Table(
  {
    // id column (text) is automatically included
    code: column.text,
    label: column.text,
    created_at: column.text,
    church_id: column.text
  },
  { indexes: {} }
);

export const health_check = new Table(
  {
    // id column (text) is automatically included
  },
  { indexes: {} }
);

export const jalons_spirituels = new Table(
  {
    // id column (text) is automatically included
    titre: column.text,
    description: column.text,
    icon_name: column.text,
    color_hex: column.text,
    order: column.integer,
    is_active: column.integer,
    created_at: column.text,
    updated_at: column.text
  },
  { indexes: {} }
);

export const journal_entries = new Table(
  {
    // id column (text) is automatically included
    journal_id: column.text,
    ref: column.text,
    description: column.text,
    entry_date: column.text,
    created_by: column.text,
    created_at: column.text,
    posted: column.integer,
    posted_at: column.text,
    posting_user: column.text,
    metadata: column.text
  },
  { indexes: {} }
);

export const journals = new Table(
  {
    // id column (text) is automatically included
    code: column.text,
    label: column.text,
    created_at: column.text
  },
  { indexes: {} }
);

export const ledger_entries = new Table(
  {
    // id column (text) is automatically included
    journal_entry_id: column.text,
    account_id: column.text,
    group_id: column.text,
    amount_bigint: column.integer,
    dc: column.text,
    currency: column.text,
    exchange_rate: column.text,
    created_at: column.text
  },
  { indexes: {} }
);

export const member_history = new Table(
  {
    // id column (text) is automatically included
    member_id: column.text,
    event_type: column.text,
    event_date: column.text,
    description: column.text,
    performed_by: column.text,
    metadata: column.text,
    church_id: column.text
  },
  { indexes: {} }
);

export const member_photo_logs = new Table(
  {
    // id column (text) is automatically included
    member_id: column.text,
    file_id: column.text,
    uploaded_at: column.text,
    action: column.text,
    triggered_at: column.text,
    triggered_by: column.text
  },
  { indexes: {} }
);

export const member_photos = new Table(
  {
    // id column (text) is automatically included
    member_id: column.text,
    drive_file_id: column.text,
    file_url: column.text,
    uploaded_at: column.text,
    is_active: column.integer,
    checksum: column.text,
    created_at: column.text,
    r2_key: column.text
  },
  { indexes: {} }
);

export const member_photos_audit = new Table(
  {
    // id column (text) is automatically included
    audit_id: column.text,
    photo_id: column.text,
    action: column.text,
    old_data: column.text,
    new_data: column.text,
    changed_by: column.text,
    changed_at: column.text
  },
  { indexes: {} }
);

export const members = new Table(
  {
    // id column (text) is automatically included
    church_id: column.text,
    first_name: column.text,
    last_name: column.text,
    email: column.text,
    phone: column.text,
    status: column.text,
    created_at: column.text,
    updated_at: column.text,
    display_name: column.text,
    gender: column.text,
    birth_date: column.text,
    address: column.text,
    photo_url: column.text,
    photo_drive_id: column.text,
    member_number: column.text,
    membership_date: column.text,
    baptism_date: column.text,
    shepherd_id: column.text,
    family_id: column.text,
    marital_status: column.text,
    occupation: column.text,
    notes: column.text,
    tags: column.text,
    is_active: column.integer,
    middle_name: column.text,
    maiden_name: column.text,
    nickname: column.text,
    title: column.text,
    suffix: column.text,
    birth_city: column.text,
    birth_country: column.text,
    death_date: column.text,
    thumbnail_url: column.text,
    membership_type: column.text,
    joining_date: column.text,
    last_active_date: column.text,
    status_note: column.text,
    whatsapp: column.text,
    accepts_whatsapp: column.integer,
    accepts_sms: column.integer,
    accepts_email: column.integer,
    emergency_contact_name: column.text,
    emergency_contact_phone: column.text,
    emergency_contact_relation: column.text,
    address_line1: column.text,
    neighborhood: column.text,
    region: column.text,
    postal_code: column.text,
    country: column.text,
    landmark: column.text,
    latitude: column.text,
    longitude: column.text,
    spouse_member_id: column.text,
    spouse_name: column.text,
    number_of_children: column.integer,
    wedding_date: column.text,
    is_baptized: column.integer,
    baptism_location: column.text,
    is_converted: column.integer,
    conversion_date: column.text,
    has_completed_membership_class: column.integer,
    has_completed_maturity_class: column.integer,
    primary_role_type: column.text,
    primary_role_title: column.text,
    cell_id: column.text,
    cell_name: column.text,
    ministry_ids: column.text,
    attendance_level: column.text,
    is_leader: column.integer,
    employment_status: column.text,
    employer: column.text,
    education_level: column.text,
    is_regular_tither: column.integer,
    last_contribution_date: column.text,
    total_contributions_this_year: column.text,
    updated_by: column.text,
    is_deleted: column.integer,
    deleted_at: column.text,
    contact_info_json: column.text,
    family_info_json: column.text,
    spiritual_info_json: column.text,
    engagement_info_json: column.text,
    professional_info_json: column.text,
    addresses_json: column.text,
    custom_fields_json: column.text
  },
  { indexes: {} }
);

export const membres_jalons = new Table(
  {
    // id column (text) is automatically included
    membre_id: column.text,
    jalon_id: column.text,
    date_realisation: column.text,
    lieu: column.text,
    temoin: column.text,
    notes: column.text,
    created_at: column.text
  },
  { indexes: {} }
);

export const mentorship_pairs = new Table(
  {
    // id column (text) is automatically included
    group_id: column.text,
    mentor_id: column.text,
    mentee_id: column.text,
    status: column.text,
    next_session_at: column.text,
    last_session_at: column.text,
    created_at: column.text,
    updated_at: column.text
  },
  { indexes: {} }
);

export const missions = new Table(
  {
    // id column (text) is automatically included
    group_id: column.text,
    title: column.text,
    description: column.text,
    budget_target_cfa: column.integer,
    start_date: column.text,
    end_date: column.text,
    is_active: column.integer,
    created_by: column.text,
    created_at: column.text,
    updated_at: column.text
  },
  { indexes: {} }
);

export const moderation_reports = new Table(
  {
    // id column (text) is automatically included
    post_id: column.text,
    reported_by: column.text,
    reason: column.text,
    category: column.text,
    severity: column.integer,
    status: column.text,
    reviewed_by: column.text,
    reviewed_at: column.text,
    created_at: column.text
  },
  { indexes: {} }
);

export const mutual_aid_requests = new Table(
  {
    // id column (text) is automatically included
    requester_id: column.text,
    type: column.text,
    description: column.text,
    status: column.text,
    created_at: column.text,
    updated_at: column.text
  },
  { indexes: {} }
);

export const notifications = new Table(
  {
    // id column (text) is automatically included
    user_id: column.text,
    title: column.text,
    body: column.text,
    type: column.text,
    is_read: column.integer,
    created_at: column.text,
    link_url: column.text,
    payload: column.text,
    priority: column.text
  },
  { indexes: {} }
);

export const pastoral_visits = new Table(
  {
    // id column (text) is automatically included
    church_id: column.text,
    shepherd_id: column.text,
    member_id: column.text,
    visit_date: column.text,
    type: column.text,
    location: column.text,
    duration: column.integer,
    notes: column.text,
    prayer_requests: column.text,
    follow_up_needed: column.integer,
    follow_up_date: column.text,
    created_at: column.text,
    updated_at: column.text
  },
  { indexes: {} }
);

export const pedagogic_resources = new Table(
  {
    // id column (text) is automatically included
    title: column.text,
    category: column.text,
    file_url: column.text,
    age_range: column.text,
    content_summary: column.text,
    created_at: column.text
  },
  { indexes: {} }
);

export const permanent_prayer_subjects = new Table(
  {
    // id column (text) is automatically included
    group_id: column.text,
    category: column.text,
    subject: column.text,
    description: column.text,
    is_active: column.integer,
    created_at: column.text,
    updated_at: column.text
  },
  { indexes: {} }
);

export const permissions = new Table(
  {
    // id column (text) is automatically included
    resource: column.text,
    action: column.text,
    description: column.text,
    created_at: column.text
  },
  { indexes: {} }
);

export const prayer_vigils = new Table(
  {
    // id column (text) is automatically included
    group_id: column.text,
    event_id: column.text,
    title: column.text,
    description: column.text,
    start_time: column.text,
    end_time: column.text,
    participants_count: column.integer,
    status: column.text,
    created_at: column.text,
    updated_at: column.text
  },
  { indexes: {} }
);

export const profiles = new Table(
  {
    // id column (text) is automatically included
    first_name: column.text,
    last_name: column.text,
    full_name: column.text,
    avatar_url: column.text,
    email: column.text,
    role_level: column.text,
    needs_onboarding: column.integer,
    onboarding_completed_at: column.text,
    last_sign_in_at: column.text,
    created_at: column.text,
    updated_at: column.text,
    presence_status: column.text,
    last_seen: column.text
  },
  { indexes: {} }
);

export const proof_images = new Table(
  {
    // id column (text) is automatically included
    transaction_id: column.text,
    original_url: column.text,
    thumbnail_url: column.text,
    sha256_client: column.text,
    sha256_server: column.text,
    file_size_bytes: column.integer,
    drive_file_id: column.text,
    mime_type: column.text,
    uploaded_by: column.text,
    uploaded_at: column.text
  },
  { indexes: {} }
);

export const reconciliation_items = new Table(
  {
    // id column (text) is automatically included
    reconciliation_id: column.text,
    transaction_id: column.text,
    is_matched: column.integer,
    created_at: column.text
  },
  { indexes: {} }
);

export const recurring_transactions = new Table(
  {
    // id column (text) is automatically included
    church_id: column.text,
    account_id: column.text,
    amount: column.text,
    type: column.text,
    category_id: column.text,
    category_name: column.text,
    description: column.text,
    frequency: column.text,
    interval_value: column.integer,
    start_date: column.text,
    next_occurrence: column.text,
    end_date: column.text,
    is_active: column.integer,
    created_at: column.text,
    updated_at: column.text,
    created_by: column.text
  },
  { indexes: {} }
);

export const rehearsals = new Table(
  {
    // id column (text) is automatically included
    created_at: column.text,
    date: column.text,
    location: column.text,
    description: column.text,
    group_id: column.text,
    event_id: column.text,
    attendance_count: column.integer
  },
  { indexes: {} }
);

export const report_snapshots = new Table(
  {
    // id column (text) is automatically included
    report_id: column.text,
    period_start: column.text,
    period_end: column.text,
    data: column.text,
    signature: column.text,
    sealed_by: column.text,
    sealed_at: column.text
  },
  { indexes: {} }
);

export const reports = new Table(
  {
    // id column (text) is automatically included
    church_id: column.text,
    user_id: column.text,
    type: column.text,
    title: column.text,
    file_path: column.text,
    file_size: column.integer,
    mime_type: column.text,
    start_date: column.text,
    end_date: column.text,
    metadata: column.text,
    created_at: column.text,
    code: column.text,
    label: column.text,
    report_type: column.text,
    params: column.text,
    generated_by: column.text,
    generated_at: column.text,
    file_drive_id: column.text,
    file_sha256: column.text,
    signature: column.text,
    status: column.text,
    approved_by: column.text,
    approved_at: column.text
  },
  { indexes: {} }
);

export const role_code_audit_log = new Table(
  {
    // id column (text) is automatically included
    code_attempt: column.text,
    user_id: column.text,
    success: column.integer,
    ip_address: column.text,
    user_agent: column.text,
    created_at: column.text
  },
  { indexes: {} }
);

export const role_permissions = new Table(
  {
    // id column (text) is automatically included
    role_id: column.text,
    permission_id: column.text,
    scope_constraint: column.text,
    created_at: column.text
  },
  { indexes: {} }
);

export const role_secret_codes = new Table(
  {
    // id column (text) is automatically included
    role_code: column.text,
    code_hash: column.text,
    is_used: column.integer,
    used_by_user_id: column.text,
    used_at: column.text,
    created_at: column.text,
    updated_at: column.text,
    raw_code: column.text,
    normalized_code: column.text
  },
  { indexes: {} }
);

export const roles = new Table(
  {
    // id column (text) is automatically included
    code: column.text,
    label: column.text,
    scope: column.text,
    priority_level: column.integer,
    is_super: column.integer,
    permissions: column.text,
    created_at: column.text
  },
  { indexes: {} }
);

export const sacraments = new Table(
  {
    // id column (text) is automatically included
    church_id: column.text,
    member_id: column.text,
    type: column.text,
    date: column.text,
    member_first_name: column.text,
    member_last_name: column.text,
    location: column.text,
    celebrant: column.text,
    godfather: column.text,
    godmother: column.text,
    spouse_name: column.text,
    spouse_birth_date: column.text,
    witnesses: column.text,
    certificate_number: column.text,
    notes: column.text,
    attachment_url: column.text,
    created_by: column.text,
    updated_by: column.text,
    created_at: column.text,
    updated_at: column.text
  },
  { indexes: {} }
);

export const service_attendance = new Table(
  {
    // id column (text) is automatically included
    service_id: column.text,
    member_id: column.text,
    checked_in_at: column.text,
    checked_in_by: column.text,
    is_guest: column.integer,
    guest_name: column.text,
    created_at: column.text
  },
  { indexes: {} }
);

export const sheet_music = new Table(
  {
    // id column (text) is automatically included
    created_at: column.text,
    updated_at: column.text,
    title: column.text,
    composer: column.text,
    category: column.text,
    file_url: column.text,
    group_id: column.text,
    created_by: column.text
  },
  { indexes: {} }
);

export const shepherds = new Table(
  {
    // id column (text) is automatically included
    church_id: column.text,
    member_id: column.text,
    first_name: column.text,
    last_name: column.text,
    photo_url: column.text,
    level: column.text,
    specialties: column.text,
    supervised_group_ids: column.text,
    bio: column.text,
    ordained_at: column.text,
    created_at: column.text,
    updated_at: column.text
  },
  { indexes: {} }
);

export const signing_keys = new Table(
  {
    // id column (text) is automatically included
    algorithm: column.text,
    public_key_pem: column.text,
    is_active: column.integer,
    activated_at: column.text,
    revoked_at: column.text,
    revocation_reason: column.text
  },
  { indexes: {} }
);

export const social_comments = new Table(
  {
    // id column (text) is automatically included
    post_id: column.text,
    author_id: column.text,
    content: column.text,
    likes_count: column.integer,
    reply_to_id: column.text,
    created_at: column.text,
    updated_at: column.text
  },
  { indexes: {} }
);

export const social_posts = new Table(
  {
    // id column (text) is automatically included
    church_id: column.text,
    author_id: column.text,
    content: column.text,
    media_urls: column.text,
    visibility: column.text,
    likes_count: column.integer,
    comments_count: column.integer,
    is_pinned: column.integer,
    created_at: column.text,
    updated_at: column.text,
    is_ai_generated: column.integer,
    ai_bible_verse: column.text,
    ai_bible_text: column.text,
    status: column.text,
    moderated_at: column.text,
    moderation_score: column.integer,
    moderation_reason: column.text
  },
  { indexes: {} }
);

export const spiritual_tracking = new Table(
  {
    // id column (text) is automatically included
    member_id: column.text,
    shepherd_id: column.text,
    last_contact_date: column.text,
    next_follow_up_date: column.text,
    spiritual_level: column.text,
    prayer_requests: column.text,
    notes: column.text,
    growth_milestones: column.text,
    updated_at: column.text,
    church_id: column.text
  },
  { indexes: {} }
);

export const sync_dead_letter_queue = new Table(
  {
    // id column (text) is automatically included
    church_id: column.text,
    table_name: column.text,
    action: column.text,
    json_data: column.text,
    local_id: column.text,
    last_error: column.text,
    attempts: column.integer,
    created_at: column.text,
    resolved_at: column.text,
    status: column.text
  },
  { indexes: {} }
);

export const system_settings = new Table(
  {
    // id column (text) is automatically included
    key: column.text,
    value: column.text,
    description: column.text,
    created_by: column.text,
    created_at: column.text,
    updated_at: column.text
  },
  { indexes: {} }
);

export const team_invites = new Table(
  {
    // id column (text) is automatically included
    team_id: column.text,
    invited_email: column.text,
    role_id: column.text,
    token_hash: column.text,
    message: column.text,
    created_by: column.text,
    created_at: column.text,
    expires_at: column.text,
    accepted_at: column.text,
    accepted_by: column.text
  },
  { indexes: {} }
);

export const team_members = new Table(
  {
    // id column (text) is automatically included
    team_id: column.text,
    user_id: column.text,
    role_id: column.text,
    joined_at: column.text,
    invited_by: column.text
  },
  { indexes: {} }
);

export const team_roles = new Table(
  {
    // id column (text) is automatically included
    team_id: column.text,
    name: column.text,
    display_name: column.text,
    permissions: column.text,
    is_default: column.integer,
    priority: column.integer,
    created_at: column.text
  },
  { indexes: {} }
);

export const teams = new Table(
  {
    // id column (text) is automatically included
    name: column.text,
    slug: column.text,
    description: column.text,
    avatar_url: column.text,
    owner_user_id: column.text,
    settings: column.text,
    created_at: column.text,
    updated_at: column.text
  },
  { indexes: {} }
);

export const trainings = new Table(
  {
    // id column (text) is automatically included
    group_id: column.text,
    title: column.text,
    description: column.text,
    date: column.text,
    location: column.text,
    capacity: column.integer,
    current_enrollment: column.integer,
    created_at: column.text,
    updated_at: column.text
  },
  { indexes: {} }
);

export const transaction_categories = new Table(
  {
    // id column (text) is automatically included
    church_id: column.text,
    name: column.text,
    type: column.text,
    parent_id: column.text,
    icon_name: column.text,
    color: column.text,
    is_budgetable: column.integer,
    sort_order: column.integer,
    is_active: column.integer,
    created_at: column.text,
    updated_at: column.text,
    code: column.text,
    display_order: column.integer,
    icon: column.text
  },
  { indexes: {} }
);

export const transaction_images = new Table(
  {
    // id column (text) is automatically included
    transaction_id: column.text,
    drive_file_id: column.text,
    filename: column.text,
    sha256: column.text,
    width: column.integer,
    height: column.integer,
    size_bytes: column.integer,
    uploaded_by: column.text,
    uploaded_at: column.text
  },
  { indexes: {} }
);

export const transaction_seals = new Table(
  {
    // id column (text) is automatically included
    transaction_id: column.text,
    payload_hash: column.text,
    signature: column.text,
    algorithm: column.text,
    signed_by: column.text,
    signed_at: column.text
  },
  { indexes: {} }
);

export const transactions = new Table(
  {
    // id column (text) is automatically included
    journal_entry_id: column.text,
    group_id: column.text,
    type: column.text,
    reference: column.text,
    amount_bigint: column.integer,
    currency: column.text,
    exchange_rate: column.text,
    source_of_funds: column.text,
    status: column.text,
    created_by: column.text,
    created_at: column.text,
    validated_by: column.text,
    validated_at: column.text,
    sealed: column.integer,
    is_internal_transfer: column.integer,
    flag: column.text,
    description: column.text,
    sealed_at: column.text
  },
  { indexes: {} }
);

export const trusted_device_events = new Table(
  {
    // id column (text) is automatically included
    device_id: column.text,
    user_id: column.text,
    event_type: column.text,
    ip_address: column.text,
    user_agent: column.text,
    metadata: column.text,
    created_at: column.text
  },
  { indexes: {} }
);

export const trusted_devices = new Table(
  {
    // id column (text) is automatically included
    user_id: column.text,
    device_fingerprint: column.text,
    token_hash: column.text,
    device_name: column.text,
    device_type: column.text,
    last_known_ip: column.text,
    last_user_agent: column.text,
    created_at: column.text,
    expires_at: column.text,
    last_used_at: column.text,
    revoked_at: column.text,
    revoked_reason: column.text
  },
  { indexes: {} }
);

export const user_churches = new Table(
  {
    // id column (text) is automatically included
    user_id: column.text,
    church_id: column.text,
    joined_at: column.text,
    is_active: column.integer,
    created_at: column.text
  },
  { indexes: {} }
);

export const user_encryption_keys = new Table(
  {
    // id column (text) is automatically included
    user_id: column.text,
    public_key: column.text,
    key_algorithm: column.text,
    created_at: column.text,
    updated_at: column.text
  },
  { indexes: {} }
);

export const user_presence = new Table(
  {
    // id column (text) is automatically included
    user_id: column.text,
    status: column.text,
    last_seen_at: column.text,
    updated_at: column.text
  },
  { indexes: {} }
);

export const user_roles = new Table(
  {
    // id column (text) is automatically included
    user_id: column.text,
    role_id: column.text,
    group_id: column.text,
    assigned_at: column.text,
    church_id: column.text,
    is_active: column.integer
  },
  { indexes: {} }
);

export const user_sessions = new Table(
  {
    // id column (text) is automatically included
    user_id: column.text,
    active_role_id: column.text,
    active_group_id: column.text,
    last_switch: column.text
  },
  { indexes: {} }
);

export const users = new Table(
  {
    // id column (text) is automatically included
    email: column.text,
    name: column.text,
    status: column.text,
    metadata: column.text,
    created_at: column.text
  },
  { indexes: {} }
);

export const validation_thresholds = new Table(
  {
    // id column (text) is automatically included
    min_amount: column.integer,
    required_signatures: column.integer,
    description: column.text,
    created_at: column.text
  },
  { indexes: {} }
);

export const visites_pastorales = new Table(
  {
    // id column (text) is automatically included
    membre_id: column.text,
    berger_id: column.text,
    date_visite: column.text,
    adresse: column.text,
    motif: column.text,
    notes: column.text,
    statut: column.text,
    created_at: column.text,
    updated_at: column.text
  },
  { indexes: {} }
);

// ============================================================
// EXPORT SCHÉMA COMPLET
// ============================================================

export const AppSchema = new Schema({
  accounts,
  activity_log,
  admin_activations,
  admin_codes,
  admin_group_subscriptions,
  ai_cron_config,
  ai_queue,
  annonces,
  app_settings,
  app_themes,
  approval_decisions,
  approval_matrices,
  approval_matrix,
  approval_matrix_steps,
  approval_notifications,
  approval_requests,
  approval_signatures,
  approvals,
  audit_logs,
  audit_user_roles,
  backup_logs,
  bank_reconciliations,
  bible_bookmarks,
  bible_highlights,
  bible_reading_daily_progress,
  bible_reading_plan_subscriptions,
  bible_reading_rewards,
  bible_search_history,
  bible_verse_annotations,
  bilan_periods,
  budgets,
  camps,
  chat_messages,
  child_safety_cards,
  children_programs,
  church_members,
  church_services,
  churches,
  circle_members,
  circles,
  compliance_results,
  compliance_rules,
  conversations,
  currencies,
  discipleship_programs,
  donations,
  donors,
  drive_files,
  event_attendances,
  event_recurrence,
  events,
  family_relationships,
  fcm_tokens,
  finance_transactions,
  financial_accounts,
  fund_sources,
  group_memberships,
  group_projects,
  group_secret_codes,
  groups,
  health_check,
  jalons_spirituels,
  journal_entries,
  journals,
  ledger_entries,
  member_history,
  member_photo_logs,
  member_photos,
  member_photos_audit,
  members,
  membres_jalons,
  mentorship_pairs,
  missions,
  moderation_reports,
  mutual_aid_requests,
  notifications,
  pastoral_visits,
  pedagogic_resources,
  permanent_prayer_subjects,
  permissions,
  prayer_vigils,
  profiles,
  proof_images,
  reconciliation_items,
  recurring_transactions,
  rehearsals,
  report_snapshots,
  reports,
  role_code_audit_log,
  role_permissions,
  role_secret_codes,
  roles,
  sacraments,
  service_attendance,
  sheet_music,
  shepherds,
  signing_keys,
  social_comments,
  social_posts,
  spiritual_tracking,
  sync_dead_letter_queue,
  system_settings,
  team_invites,
  team_members,
  team_roles,
  teams,
  trainings,
  transaction_categories,
  transaction_images,
  transaction_seals,
  transactions,
  trusted_device_events,
  trusted_devices,
  user_churches,
  user_encryption_keys,
  user_presence,
  user_roles,
  user_sessions,
  users,
  validation_thresholds,
  visites_pastorales
});

export type Database = (typeof AppSchema)['types'];
