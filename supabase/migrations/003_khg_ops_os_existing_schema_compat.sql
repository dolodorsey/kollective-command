create extension if not exists pgcrypto;

alter table public.khg_departments add column if not exists department_key text;
alter table public.khg_departments add column if not exists purpose text;
alter table public.khg_departments add column if not exists route_path text;
alter table public.khg_departments add column if not exists source_system text default 'mcp_gateway';
alter table public.khg_departments add column if not exists priority_order integer default 100;
alter table public.khg_departments add column if not exists metadata jsonb not null default '{}'::jsonb;

update public.khg_departments
set department_key = coalesce(department_key, lower(regexp_replace(name, '[^a-zA-Z0-9]+', '_', 'g'))),
    purpose = coalesce(purpose, mission),
    priority_order = coalesce(priority_order, priority_rank, 100)
where department_key is null;

create unique index if not exists khg_departments_department_key_key
on public.khg_departments(department_key);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema='public'
      and table_name='khg_departments'
      and column_name='dept_number'
  ) then
    update public.khg_departments set department_key='daily_ops', purpose='Today command board and urgent movement', route_path='/ops-os', priority_order=10, updated_at=now() where dept_number=33;
    update public.khg_departments set department_key='social', purpose='Programmable social calendar, captions, graphics, approvals, publishing', route_path='/ops-os/social', priority_order=20, updated_at=now() where dept_number=13;
    update public.khg_departments set department_key='marketing', purpose='Email, SMS, Evite/Eventbrite, SEO, ads, retargeting, and engagement schedule', route_path='/ops-os/marketing', priority_order=30, updated_at=now() where dept_number=14;
    update public.khg_departments set department_key='content_studio', purpose='Creative briefs, assets, prompt packs, uploads, and previews', route_path='/ops-os/content-studio', priority_order=40, updated_at=now() where dept_number=16;
    update public.khg_departments set department_key='events', purpose='Event rollout command center', route_path='/ops-os/events', priority_order=50, updated_at=now() where dept_number=36;
    update public.khg_departments set department_key='revenue', purpose='Revenue opportunities, offers, follow-ups, and collections', route_path='/ops-os/revenue', priority_order=60, updated_at=now() where dept_number=1;
    update public.khg_departments set department_key='tasks', purpose='Task hub with blockers, handoffs, proof, and recurring work', route_path='/ops-os/tasks', priority_order=80, updated_at=now() where dept_number=29;

    insert into public.khg_departments (dept_number, department_key, division, name, mission, purpose, route_path, priority_rank, priority_order, status)
    values (46,'approvals','Command','Approvals','Universal approval queue','Universal approval queue','/ops-os/approvals',70,70,'active')
    on conflict (department_key) do update set
      division=excluded.division,
      name=excluded.name,
      mission=excluded.mission,
      purpose=excluded.purpose,
      route_path=excluded.route_path,
      priority_rank=excluded.priority_rank,
      priority_order=excluded.priority_order,
      status=excluded.status,
      updated_at=now();
  end if;
end $$;

create table if not exists public.khg_dashboard_cards (
  id uuid primary key default gen_random_uuid(),
  department_key text not null,
  card_key text not null unique,
  title text not null,
  subtitle text,
  priority text not null default 'p2',
  primary_action_label text not null default 'Open Department',
  primary_route text not null,
  secondary_action_label text,
  secondary_route text,
  owner_label text,
  status text not null default 'active',
  metric_payload jsonb not null default '{}'::jsonb,
  next_best_action text,
  blocker_count integer not null default 0,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.khg_work_queues (
  id uuid primary key default gen_random_uuid(),
  department_key text not null,
  queue_key text not null,
  brand_key text,
  source_type text,
  source_id text,
  title text not null,
  description text,
  priority text not null default 'normal',
  status text not null default 'open',
  owner_label text,
  due_at timestamptz,
  proof_required boolean not null default false,
  proof_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.khg_action_registry (
  id uuid primary key default gen_random_uuid(),
  action_key text not null unique,
  department_key text,
  label text not null,
  action_type text not null,
  route_path text,
  webhook_key text,
  requires_confirmation boolean not null default false,
  is_primary boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.khg_approval_requests (
  id uuid primary key default gen_random_uuid(),
  approval_key text unique,
  department_key text,
  brand_key text,
  source_type text not null,
  source_id text,
  title text not null,
  preview_url text,
  preview_text text,
  requested_by text,
  approver_label text default 'Dr. Dorsey',
  status text not null default 'pending',
  risk_level text not null default 'normal',
  decision_note text,
  decided_at timestamptz,
  due_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.khg_social_accounts (
  id uuid primary key default gen_random_uuid(),
  brand_key text not null,
  account_label text not null,
  platform text not null,
  handle text,
  account_url text,
  connection_status text not null default 'manual',
  default_post_times jsonb not null default '[]'::jsonb,
  voice_profile_key text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.khg_content_campaigns (
  id uuid primary key default gen_random_uuid(),
  campaign_key text not null unique,
  brand_key text,
  campaign_name text not null,
  campaign_type text not null default 'social',
  objective text,
  start_date date,
  end_date date,
  status text not null default 'draft',
  owner_label text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.khg_content_items (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.khg_content_campaigns(id) on delete set null,
  brand_key text not null,
  platform text not null default 'instagram',
  content_type text not null default 'post',
  title text not null,
  brief text,
  cta text,
  target_url text,
  status text not null default 'idea',
  priority text not null default 'normal',
  owner_label text,
  source_plan_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.khg_content_assets (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid references public.khg_content_items(id) on delete cascade,
  brand_key text not null,
  asset_type text not null default 'graphic',
  asset_url text,
  file_name text,
  thumbnail_url text,
  upload_source text default 'manual_upload',
  generation_prompt text,
  generation_tool text,
  status text not null default 'draft',
  version integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.khg_content_captions (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid references public.khg_content_items(id) on delete cascade,
  caption_text text not null,
  hook text,
  hashtags text,
  cta text,
  status text not null default 'draft',
  version integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.khg_content_calendar_slots (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid references public.khg_content_items(id) on delete cascade,
  social_account_id uuid references public.khg_social_accounts(id) on delete set null,
  brand_key text not null,
  platform text not null,
  scheduled_for timestamptz not null,
  timezone text not null default 'America/New_York',
  slot_status text not null default 'planned',
  drag_order integer default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.khg_content_generation_requests (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid references public.khg_content_items(id) on delete cascade,
  brand_key text not null,
  request_type text not null,
  request_prompt text not null,
  source_files jsonb not null default '[]'::jsonb,
  target_dimensions text,
  requested_tool text default 'ai',
  status text not null default 'queued',
  output_payload jsonb not null default '{}'::jsonb,
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.khg_content_publish_attempts (
  id uuid primary key default gen_random_uuid(),
  calendar_slot_id uuid references public.khg_content_calendar_slots(id) on delete cascade,
  content_item_id uuid references public.khg_content_items(id) on delete cascade,
  platform text not null,
  attempted_at timestamptz not null default now(),
  status text not null,
  external_post_id text,
  external_post_url text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.khg_content_performance (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid references public.khg_content_items(id) on delete cascade,
  platform text not null,
  measured_at timestamptz not null default now(),
  impressions integer default 0,
  reach integer default 0,
  likes integer default 0,
  comments integer default 0,
  shares integer default 0,
  saves integer default 0,
  clicks integer default 0,
  leads integer default 0,
  revenue numeric default 0,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.khg_marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  campaign_key text not null unique,
  brand_key text,
  campaign_name text not null,
  campaign_goal text,
  offer_name text,
  funnel_stage text default 'awareness',
  start_date date,
  end_date date,
  budget numeric default 0,
  status text not null default 'draft',
  owner_label text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.khg_marketing_calendar_items (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.khg_marketing_campaigns(id) on delete cascade,
  brand_key text,
  channel text not null,
  title text not null,
  copy_preview text,
  asset_url text,
  audience_key text,
  scheduled_for timestamptz,
  timezone text not null default 'America/New_York',
  status text not null default 'planned',
  ghl_workflow_id text,
  external_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.khg_event_rollouts (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  brand_key text,
  event_name text not null,
  event_date date,
  venue_name text,
  city text,
  ticketing_url text,
  flyer_asset_url text,
  social_campaign_id uuid references public.khg_content_campaigns(id) on delete set null,
  marketing_campaign_id uuid references public.khg_marketing_campaigns(id) on delete set null,
  ambassador_status text default 'not_started',
  street_team_status text default 'not_started',
  staffing_status text default 'not_started',
  status text not null default 'planning',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.khg_task_links (
  id uuid primary key default gen_random_uuid(),
  task_source_table text not null default 'tasks',
  task_id text not null,
  department_key text,
  brand_key text,
  linked_type text not null,
  linked_id text not null,
  blocker_reason text,
  proof_required boolean not null default false,
  proof_url text,
  handoff_to text,
  handoff_status text default 'not_started',
  revenue_impact numeric default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

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
  status text not null default 'open',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_khg_work_queues_department_status on public.khg_work_queues(department_key, status);
create index if not exists idx_khg_work_queues_brand_due on public.khg_work_queues(brand_key, due_at);
create index if not exists idx_khg_approval_requests_status on public.khg_approval_requests(status, due_at);
create index if not exists idx_khg_content_items_brand_status on public.khg_content_items(brand_key, status);
create index if not exists idx_khg_content_calendar_slots_time on public.khg_content_calendar_slots(scheduled_for, slot_status);
create index if not exists idx_khg_marketing_calendar_items_time on public.khg_marketing_calendar_items(channel, scheduled_for, status);
create index if not exists idx_khg_revenue_opportunities_lane_status on public.khg_revenue_opportunities(revenue_lane, status, due_at);

insert into public.khg_dashboard_cards (department_key, card_key, title, subtitle, priority, primary_action_label, primary_route, secondary_action_label, secondary_route, owner_label, next_best_action)
values
  ('daily_ops','daily_ops_command','Daily Ops','Today command board and urgent cross-department movement','p0','Open Daily Command','/ops-os','Add Task','/ops-os/tasks?tab=create','Command','Open the Ops OS home and move the highest-priority blockers first.'),
  ('social','social_command','Social Media Command','Calendar, graphics, captions, uploads, scheduling, and performance','p0','Open Social Command','/ops-os/social','Quick Upload','/ops-os/social?tab=upload','Social Ops','Open the full social calendar and clear missing graphic/caption approvals.'),
  ('marketing','marketing_calendar','Marketing Calendar','Email, SMS, Evite/Eventbrite, SEO, ads, and engagement schedule','p0','Open Marketing Calendar','/ops-os/marketing','Create Campaign','/ops-os/marketing?tab=create','Marketing Ops','Program every campaign by channel with approval and send status.'),
  ('content_studio','content_studio','Content Studio','Creative requests, prompt packs, assets, and previews','p1','Open Content Studio','/ops-os/content-studio','New Creative Request','/ops-os/content-studio?tab=requests','Content Team','Turn uploaded plans into approved assets before scheduled publish time.'),
  ('approvals','approval_command','Approval Command','Universal queue for graphics, captions, emails, ads, events, and automations','p0','Open Approvals','/ops-os/approvals','Approve Next','/ops-os/approvals?filter=pending','Dr. Dorsey','Clear approvals blocking posts, sends, and revenue moves.'),
  ('events','event_command','Events Command','Ticketing, flyers, ambassadors, street team, staffing, and rollout readiness','p1','Open Events Command','/ops-os/events','Add Event','/ops-os/events?tab=create','Events Ops','Open each event rollout and fix missing ticketing, creative, or staffing.'),
  ('revenue','revenue_command','Revenue Command','HELP 911, Good Times, Casper, sponsors, consults, courses, products, and collections','p0','Open Revenue Command','/ops-os/revenue','Add Money Move','/ops-os/revenue?tab=create','Revenue Ops','Work the highest-value follow-ups first.'),
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
    execute format('revoke insert, update, delete on public.%I from anon', table_name);
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
