import { column, Schema, Table } from '@powersync/web';
// OR: import { column, Schema, Table } from '@powersync/react-native';

const profiles = new Table(
  {
    // id column (text) is automatically included
    email: column.text,
    first_name: column.text,
    last_name: column.text,
    role: column.text,
    org_id: column.text,
    created_at: column.text,
    updated_at: column.text
  },
  { indexes: {} }
);

const members = new Table(
  {
    // id column (text) is automatically included
    org_id: column.text,
    first_name: column.text,
    last_name: column.text,
    phone: column.text,
    email: column.text,
    status: column.text,
    joined_at: column.text,
    archived_at: column.text,
    archived_by: column.text,
    archive_reason: column.text,
    created_at: column.text,
    updated_at: column.text
  },
  { indexes: {} }
);

const transactions = new Table(
  {
    // id column (text) is automatically included
    org_id: column.text,
    type: column.text,
    amount: column.integer,
    description: column.text,
    date: column.text,
    status: column.text,
    category_id: column.text,
    org_unit_id: column.text,
    compensates_for: column.text,
    comment: column.text,
    version: column.integer,
    created_by_id: column.text,
    approved_by_id: column.text,
    created_at: column.text,
    updated_at: column.text,
    approved_at: column.text,
    event_id: column.text,
    source: column.text,
    person_name: column.text,
    source_caisse_id: column.text,
    versement_id: column.text,
    reversal_of_id: column.text
  },
  { indexes: {} }
);

const events = new Table(
  {
    // id column (text) is automatically included
    org_id: column.text,
    name: column.text,
    description: column.text,
    start_date: column.text,
    end_date: column.text,
    status: column.text,
    budget: column.integer,
    created_at: column.text,
    updated_at: column.text,
    budget_items: column.text
  },
  { indexes: {} }
);

const notifications = new Table(
  {
    // id column (text) is automatically included
    org_id: column.text,
    action_type: column.text,
    title: column.text,
    message: column.text,
    is_read: column.integer,
    source_transaction_id: column.text,
    created_at: column.text
  },
  { indexes: {} }
);

export const AppSchema = new Schema({
  profiles,
  members,
  transactions,
  events,
  notifications
});

export type Database = (typeof AppSchema)['types'];

