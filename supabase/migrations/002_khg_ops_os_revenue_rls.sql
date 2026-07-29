create extension if not exists pgcrypto;

create table if not exists public.khg_revenue_opportunities (
  id uuid primary key default gen_random_uuid(),
  brand_key text,
  revenue_lane text not null,
  opportunity_name text not null,
  contact_name text,
  contact_method text,
  offer_name text,
  estimated_value numeric default 0,
  next_action text,
  blocker_reason text,
  owner_label text,
  due_at timestamptz,
  status text not null default 'open' check (status in ('open','in_progress','blocked','won','lost','archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_khg_revenue_opportunities_lane_status
on public.khg_revenue_opportunities(revenue_lane, status, due_at);

insert into public.khg_dashboard_cards (department_key, card_key, title, subtitle, priority, primary_action_label, primary_route, secondary_action_label, secondary_route, owner_label, next_best_action)
values
  ('daily_ops','daily_ops_command','Daily Ops','Today command board and urgent cross-department movement','p0','Open Daily Command','/ops-os','Add Task','/ops-os/tasks?tab=create','Command','Open the Ops OS home and move the highest-priority blockers first.'),
  ('tasks','task_command','Task Command','Work queue, blockers, handoffs, proof, recurring work, and done states','p0','Open Task Command','/ops-os/tasks','Add Task','/ops-os/tasks?tab=create','Operations','Clear blocked work and assign proof-required tasks.')
on conflict (card_key) do update set
  title=excluded.title,
  subtitle=excluded.subtitle,
  priority=excluded.priority,
  primary_action_label=excluded.primary_action_label,
  primary_route=excluded.primary_route,
  secondary_action_label=excluded.secondary_action_label,
  secondary_route=excluded.secondary_route,
  owner_label=excluded.owner_label,
  next_best_action=excluded.next_best_action,
  updated_at=now();

create or replace view public.v_khg_social_command
with (security_invoker = true) as
select
  i.id,
  i.brand_key,
  i.platform,
  i.content_type,
  i.title,
  i.status,
  s.scheduled_for,
  a.asset_url,
  a.thumbnail_url,
  c.caption_text
from public.khg_content_items i
left join public.khg_content_calendar_slots s on s.content_item_id = i.id
left join public.khg_content_assets a on a.content_item_id = i.id
left join public.khg_content_captions c on c.content_item_id = i.id;

do $$
declare
  table_name text;
  table_names text[] := array[
    'khg_departments',
    'khg_dashboard_cards',
    'khg_work_queues',
    'khg_action_registry',
    'khg_approval_requests',
    'khg_social_accounts',
    'khg_content_campaigns',
    'khg_content_items',
    'khg_content_assets',
    'khg_content_captions',
    'khg_content_calendar_slots',
    'khg_content_generation_requests',
    'khg_content_publish_attempts',
    'khg_content_performance',
    'khg_marketing_campaigns',
    'khg_marketing_calendar_items',
    'khg_event_rollouts',
    'khg_task_links',
    'khg_revenue_opportunities'
  ];
begin
  foreach table_name in array table_names loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('grant select on public.%I to anon, authenticated', table_name);
    execute format('grant insert, update, delete on public.%I to authenticated', table_name);

    execute format('drop policy if exists "anon read %s" on public.%I', table_name, table_name);
    execute format('drop policy if exists "authenticated read %s" on public.%I', table_name, table_name);
    execute format('drop policy if exists "authenticated write %s" on public.%I', table_name, table_name);

    execute format('create policy "anon read %s" on public.%I for select to anon using (true)', table_name, table_name);
    execute format('create policy "authenticated read %s" on public.%I for select to authenticated using (true)', table_name, table_name);
    execute format('create policy "authenticated write %s" on public.%I for all to authenticated using (true) with check (true)', table_name, table_name);
  end loop;
end $$;

grant select on public.v_khg_social_command to anon, authenticated;
