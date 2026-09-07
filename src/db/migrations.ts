/**
 * Local SQLite migrations. Append-only: never edit a statement that has
 * already shipped, add a new entry instead.
 */
export const MIGRATIONS: string[] = [
  // 1 — core tables
  `
  create table if not exists settings (
    id                    integer primary key check (id = 1),
    currency              text    not null default 'EGP',
    locale                text    not null default 'ar-EG',
    salary_amount         integer not null default 0,
    salary_day            integer not null default 1,
    is_pro                integer not null default 0,
    onboarding_done       integer not null default 0,
    biometric_lock        integer not null default 0,
    weekly_report_enabled integer not null default 1,
    weekly_report_dow     integer not null default 5,
    weekly_report_hour    integer not null default 20,
    dirty                 integer not null default 1,
    updated_at            text    not null default ''
  );

  create table if not exists categories (
    id            text primary key,
    slug          text not null unique,
    name          text not null,
    icon          text not null default 'ellipsis-horizontal',
    color         text not null default '#8E8E93',
    is_default    integer not null default 0,
    monthly_limit integer,
    sort_order    integer not null default 0,
    dirty         integer not null default 1,
    updated_at    text not null default '',
    deleted_at    text
  );

  create table if not exists transactions (
    id          text primary key,
    amount      integer not null,
    type        text not null default 'expense',
    category_id text references categories (id) on delete set null,
    note        text,
    occurred_at text not null,
    source      text not null default 'manual',
    dirty       integer not null default 1,
    updated_at  text not null default '',
    deleted_at  text
  );
  create index if not exists transactions_occurred_idx on transactions (occurred_at desc);
  create index if not exists transactions_dirty_idx on transactions (dirty);

  create table if not exists recurring (
    id           text primary key,
    title        text not null,
    amount       integer not null,
    type         text not null default 'expense',
    category_id  text references categories (id) on delete set null,
    day_of_month integer not null,
    is_active    integer not null default 1,
    last_run_on  text,
    dirty        integer not null default 1,
    updated_at   text not null default '',
    deleted_at   text
  );

  create table if not exists debts (
    id          text primary key,
    person_name text not null,
    amount      integer not null,
    direction   text not null,
    due_date    text,
    settled     integer not null default 0,
    note        text,
    dirty       integer not null default 1,
    updated_at  text not null default '',
    deleted_at  text
  );

  create table if not exists goals (
    id            text primary key,
    title         text not null,
    target_amount integer not null,
    saved_amount  integer not null default 0,
    deadline      text,
    dirty         integer not null default 1,
    updated_at    text not null default '',
    deleted_at    text
  );

  create table if not exists sync_state (
    table_name  text primary key,
    last_pulled text not null default ''
  );
  `,
];
