-- مصاريفي — core schema
-- Offline-first: every row is created client-side with a client-generated UUID,
-- carries updated_at for last-write-wins sync and deleted_at as a tombstone.

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------- settings
create table public.settings (
  user_id           uuid primary key references auth.users (id) on delete cascade,
  currency          text        not null default 'EGP',
  locale            text        not null default 'ar-EG',
  salary_amount     bigint      not null default 0,      -- minor units (piastres)
  salary_day        smallint    not null default 1,
  is_pro            boolean     not null default false,
  onboarding_done   boolean     not null default false,
  biometric_lock    boolean     not null default false,
  weekly_report_enabled boolean not null default true,
  weekly_report_dow smallint    not null default 5,       -- 5 = Friday
  weekly_report_hour smallint   not null default 20,      -- 20:00 local
  updated_at        timestamptz not null default now(),
  constraint settings_salary_day_range check (salary_day between 1 and 31),
  constraint settings_salary_amount_nonneg check (salary_amount >= 0),
  constraint settings_dow_range check (weekly_report_dow between 0 and 6),
  constraint settings_hour_range check (weekly_report_hour between 0 and 23)
);

-- -------------------------------------------------------------- categories
create table public.categories (
  id            uuid        primary key,
  user_id       uuid        not null references auth.users (id) on delete cascade,
  slug          text        not null,
  name          text        not null,
  icon          text        not null default 'ellipsis-horizontal',
  color         text        not null default '#8E8E93',
  is_default    boolean     not null default false,
  monthly_limit bigint,
  sort_order    integer     not null default 0,
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  constraint categories_limit_nonneg check (monthly_limit is null or monthly_limit >= 0)
);
create unique index categories_user_slug_key on public.categories (user_id, slug);
create index categories_user_updated_idx on public.categories (user_id, updated_at);

-- ------------------------------------------------------------ transactions
create table public.transactions (
  id          uuid        primary key,
  user_id     uuid        not null references auth.users (id) on delete cascade,
  amount      bigint      not null,                       -- minor units, always > 0
  type        text        not null default 'expense',
  category_id uuid        references public.categories (id) on delete set null,
  note        text,
  occurred_at timestamptz not null default now(),
  source      text        not null default 'manual',
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  constraint transactions_amount_positive check (amount > 0),
  constraint transactions_type_valid check (type in ('expense', 'income')),
  constraint transactions_source_valid
    check (source in ('manual', 'sms', 'voice', 'recurring', 'widget', 'ocr'))
);
create index transactions_user_occurred_idx on public.transactions (user_id, occurred_at desc);
create index transactions_user_updated_idx  on public.transactions (user_id, updated_at);
create index transactions_category_idx      on public.transactions (category_id);

-- --------------------------------------------------------------- recurring
create table public.recurring (
  id           uuid        primary key,
  user_id      uuid        not null references auth.users (id) on delete cascade,
  title        text        not null,
  amount       bigint      not null,
  type         text        not null default 'expense',
  category_id  uuid        references public.categories (id) on delete set null,
  day_of_month smallint    not null,
  is_active    boolean     not null default true,
  last_run_on  date,                                      -- last month already materialised
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  constraint recurring_amount_positive check (amount > 0),
  constraint recurring_day_range check (day_of_month between 1 and 31),
  constraint recurring_type_valid check (type in ('expense', 'income'))
);
create index recurring_user_updated_idx on public.recurring (user_id, updated_at);

-- ------------------------------------------------------------------- debts
create table public.debts (
  id          uuid        primary key,
  user_id     uuid        not null references auth.users (id) on delete cascade,
  person_name text        not null,
  amount      bigint      not null,
  direction   text        not null,
  due_date    date,
  settled     boolean     not null default false,
  note        text,
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  constraint debts_amount_positive check (amount > 0),
  constraint debts_direction_valid check (direction in ('owed_to', 'owed_by'))
);
create index debts_user_updated_idx on public.debts (user_id, updated_at);

-- ------------------------------------------------------------------- goals
create table public.goals (
  id            uuid        primary key,
  user_id       uuid        not null references auth.users (id) on delete cascade,
  title         text        not null,
  target_amount bigint      not null,
  saved_amount  bigint      not null default 0,
  deadline      date,
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  constraint goals_target_positive check (target_amount > 0),
  constraint goals_saved_nonneg check (saved_amount >= 0)
);
create index goals_user_updated_idx on public.goals (user_id, updated_at);

-- ---------------------------------------------------------------- triggers
create trigger settings_touch     before update on public.settings     for each row execute function public.touch_updated_at();
create trigger categories_touch   before update on public.categories   for each row execute function public.touch_updated_at();
create trigger transactions_touch before update on public.transactions for each row execute function public.touch_updated_at();
create trigger recurring_touch    before update on public.recurring    for each row execute function public.touch_updated_at();
create trigger debts_touch        before update on public.debts        for each row execute function public.touch_updated_at();
create trigger goals_touch        before update on public.goals        for each row execute function public.touch_updated_at();
