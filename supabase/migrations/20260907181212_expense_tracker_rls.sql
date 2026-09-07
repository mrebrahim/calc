-- Every table is scoped to the signed-in (anonymous) user.
alter table public.settings     alter column user_id set default auth.uid();
alter table public.categories   alter column user_id set default auth.uid();
alter table public.transactions alter column user_id set default auth.uid();
alter table public.recurring    alter column user_id set default auth.uid();
alter table public.debts        alter column user_id set default auth.uid();
alter table public.goals        alter column user_id set default auth.uid();

alter table public.settings     enable row level security;
alter table public.categories   enable row level security;
alter table public.transactions enable row level security;
alter table public.recurring    enable row level security;
alter table public.debts        enable row level security;
alter table public.goals        enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['settings', 'categories', 'transactions', 'recurring', 'debts', 'goals']
  loop
    execute format(
      'create policy %I on public.%I for select to authenticated using (user_id = (select auth.uid()))',
      t || '_select_own', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (user_id = (select auth.uid()))',
      t || '_insert_own', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
      t || '_update_own', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (user_id = (select auth.uid()))',
      t || '_delete_own', t);
  end loop;
end;
$$;
