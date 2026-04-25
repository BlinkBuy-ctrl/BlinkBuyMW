-- ============================================================
-- BLINKBUY MLW — SUPABASE SCHEMA v2
-- Fixed all code↔DB mismatches. Run this fresh in SQL Editor.
-- ============================================================

-- ─────────────────────────────────────────────
-- 0. EXTENSIONS
-- ─────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────
-- 1. DROP OLD TABLES (clean slate)
-- ─────────────────────────────────────────────
drop table if exists public.emergency_requests  cascade;
drop table if exists public.emergency_services  cascade;
drop table if exists public.notifications       cascade;
drop table if exists public.messages            cascade;
drop table if exists public.conversations       cascade;
drop table if exists public.applications        cascade;
drop table if exists public.reviews             cascade;
drop table if exists public.bookings            cascade;
drop table if exists public.marketplace_items   cascade;
drop table if exists public.jobs                cascade;
drop table if exists public.services            cascade;
drop table if exists public.profiles            cascade;

-- ─────────────────────────────────────────────
-- 2. PROFILES
-- NOTE: Code accesses these columns with snake_case (profile_photo,
--       is_online, is_verified, is_trusted, jobs_completed,
--       review_count, profile_strength). Keep them snake_case.
-- ─────────────────────────────────────────────
create table public.profiles (
  id               uuid        primary key references auth.users(id) on delete cascade,
  email            text        not null,
  name             text        not null,
  phone            text,
  whatsapp         text,
  role             text        not null default 'customer'
                                 check (role in ('customer','worker','both','admin')),
  location         text,
  -- FIX: code/settings uses profilePhoto → mapped to profile_photo (snake_case in DB)
  profile_photo    text,
  bio              text,
  is_online        boolean     not null default false,
  is_verified      boolean     not null default false,
  is_trusted       boolean     not null default false,
  rating           numeric(3,2) not null default 0,
  review_count     int         not null default 0,
  jobs_completed   int         not null default 0,
  profile_strength int         not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, name, phone, role, location)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    new.raw_user_meta_data->>'phone',
    coalesce(new.raw_user_meta_data->>'role', 'customer'),
    new.raw_user_meta_data->>'location'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────────
-- 2b. WELCOME MESSAGE ON NEW USER SIGNUP
-- Fires after profile row is created (handle_new_user runs first on auth.users,
-- this trigger runs after insert on public.profiles).
-- Admin UUID is resolved by email — never hardcoded or exposed to frontend.
-- Uses security definer so it can bypass RLS for service-level inserts.
-- ─────────────────────────────────────────────
create or replace function public.handle_new_user_welcome()
returns trigger
language plpgsql
security definer
as $$
declare
  admin_id uuid;
  conv_id  uuid;
begin
  -- Resolve admin by email (keep email in env var on backend; never in frontend)
  select id into admin_id
    from public.profiles
   where email = 'otechy8@gmail.com'
   limit 1;

  -- Bail silently if admin account doesn't exist yet
  if admin_id is null then return new; end if;

  -- Skip if somehow triggered for the admin's own profile
  if admin_id = new.id then return new; end if;

  -- Create conversation (unique constraint prevents duplicates on re-run)
  insert into public.conversations (user1_id, user2_id, created_at)
  values (admin_id, new.id, now())
  on conflict (user1_id, user2_id) do nothing
  returning id into conv_id;

  -- If conversation already existed, fetch its id
  if conv_id is null then
    select id into conv_id
      from public.conversations
     where user1_id = admin_id and user2_id = new.id;
  end if;

  -- Insert welcome message from admin
  insert into public.messages (conversation_id, sender_id, content, created_at)
  values (
    conv_id,
    admin_id,
    '👋 Welcome to BlinkBuy Malawi! I''m here to help. If you have questions, need to report a scam, or want guidance on using the app — just message here. We''re happy to assist!',
    now()
  );

  -- Insert bell notification for new user
  -- uses `body` (correct column) and `welcome` type (added to check constraint above)
  insert into public.notifications (user_id, type, title, body, read, created_at)
  values (
    new.id,
    'welcome',
    'Welcome to BlinkBuy! 👋',
    'You have a message from our support team. Tap to read.',
    false,
    now()
  );

  return new;
end;
$$;

drop trigger if exists on_new_user_welcome on public.profiles;
create trigger on_new_user_welcome
  after insert on public.profiles
  for each row execute function public.handle_new_user_welcome();

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin NEW.updated_at = now(); return NEW; end;
$$;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- ─────────────────────────────────────────────
-- 3. SERVICES
-- FIX: code sends priceType → must be price_type
--      code sends isOnline  → must be is_online
--      code sends priceDisplay → must be price_display
-- ─────────────────────────────────────────────
create table public.services (
  id            uuid         primary key default uuid_generate_v4(),
  worker_id     uuid         not null references public.profiles(id) on delete cascade,
  title         text         not null,
  description   text         not null,
  category      text         not null,
  location      text         not null,
  price         numeric(12,2),
  price_type    text         not null default 'fixed'
                               check (price_type in ('fixed','hourly','daily','negotiable')),
  price_display text,
  tags          text[]       not null default '{}',
  is_online     boolean      not null default true,
  rating        numeric(3,2) not null default 0,
  review_count  int          not null default 0,
  status        text         not null default 'active'
                               check (status in ('active','paused','deleted')),
  created_at    timestamptz  not null default now(),
  updated_at    timestamptz  not null default now()
);

create trigger trg_services_updated_at
  before update on public.services
  for each row execute procedure public.set_updated_at();

-- ─────────────────────────────────────────────
-- 4. BOOKINGS
-- ─────────────────────────────────────────────
create table public.bookings (
  id          uuid        primary key default uuid_generate_v4(),
  service_id  uuid        not null references public.services(id) on delete cascade,
  customer_id uuid        not null references public.profiles(id) on delete cascade,
  message     text,
  status      text        not null default 'pending'
                            check (status in ('pending','accepted','rejected','completed','cancelled')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_bookings_updated_at
  before update on public.bookings
  for each row execute procedure public.set_updated_at();

-- ─────────────────────────────────────────────
-- 5. REVIEWS
-- ─────────────────────────────────────────────
create table public.reviews (
  id          uuid        primary key default uuid_generate_v4(),
  service_id  uuid        references public.services(id) on delete cascade,
  worker_id   uuid        not null references public.profiles(id) on delete cascade,
  reviewer_id uuid        not null references public.profiles(id) on delete cascade,
  rating      int         not null check (rating between 1 and 5),
  comment     text,
  created_at  timestamptz not null default now()
);

create or replace function public.refresh_ratings()
returns trigger language plpgsql security definer as $$
begin
  if (TG_OP = 'DELETE' and OLD.service_id is not null) or
     (TG_OP != 'DELETE' and NEW.service_id is not null) then
    update public.services set
      rating       = coalesce((select avg(rating) from public.reviews where service_id = coalesce(NEW.service_id, OLD.service_id)), 0),
      review_count = (select count(*) from public.reviews where service_id = coalesce(NEW.service_id, OLD.service_id))
    where id = coalesce(NEW.service_id, OLD.service_id);
  end if;
  update public.profiles set
    rating       = coalesce((select avg(rating) from public.reviews where worker_id = coalesce(NEW.worker_id, OLD.worker_id)), 0),
    review_count = (select count(*) from public.reviews where worker_id = coalesce(NEW.worker_id, OLD.worker_id))
  where id = coalesce(NEW.worker_id, OLD.worker_id);
  return coalesce(NEW, OLD);
end;
$$;

drop trigger if exists trg_refresh_ratings on public.reviews;
create trigger trg_refresh_ratings
  after insert or update or delete on public.reviews
  for each row execute procedure public.refresh_ratings();

-- ─────────────────────────────────────────────
-- 6. JOBS
-- FIX: api.ts was inserting `posted_by` — correct column is `poster_id`
-- ─────────────────────────────────────────────
create table public.jobs (
  id                uuid        primary key default uuid_generate_v4(),
  poster_id         uuid        not null references public.profiles(id) on delete cascade,
  title             text        not null,
  description       text        not null,
  location          text        not null,
  type              text        not null default 'One-time Task'
                                  check (type in ('Full-time','Part-time','Contract','Freelance','One-time Task')),
  budget            numeric(12,2),
  skills            text[]      not null default '{}',
  is_urgent         boolean     not null default false,
  application_count int         not null default 0,
  status            text        not null default 'open'
                                  check (status in ('open','closed','deleted')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger trg_jobs_updated_at
  before update on public.jobs
  for each row execute procedure public.set_updated_at();

-- ─────────────────────────────────────────────
-- 7. APPLICATIONS
-- ─────────────────────────────────────────────
create table public.applications (
  id            uuid        primary key default uuid_generate_v4(),
  job_id        uuid        not null references public.jobs(id) on delete cascade,
  applicant_id  uuid        not null references public.profiles(id) on delete cascade,
  cover_letter  text,
  proposed_rate numeric(12,2),
  status        text        not null default 'pending'
                              check (status in ('pending','accepted','rejected')),
  created_at    timestamptz not null default now(),
  unique (job_id, applicant_id)
);

create or replace function public.sync_application_count()
returns trigger language plpgsql security definer as $$
begin
  update public.jobs set
    application_count = (select count(*) from public.applications where job_id = coalesce(NEW.job_id, OLD.job_id))
  where id = coalesce(NEW.job_id, OLD.job_id);
  return coalesce(NEW, OLD);
end;
$$;

drop trigger if exists trg_application_count on public.applications;
create trigger trg_application_count
  after insert or delete on public.applications
  for each row execute procedure public.sync_application_count();

-- ─────────────────────────────────────────────
-- 8. MARKETPLACE ITEMS
-- ─────────────────────────────────────────────
create table public.marketplace_items (
  id          uuid        primary key default uuid_generate_v4(),
  seller_id   uuid        not null references public.profiles(id) on delete cascade,
  title       text        not null,
  description text        not null,
  category    text        not null,
  condition   text        not null default 'Good'
                            check (condition in ('New','Like New','Good','Fair','For Parts')),
  price       numeric(12,2) not null,
  location    text        not null,
  images      text[]      not null default '{}',
  status      text        not null default 'available'
                            check (status in ('available','sold','deleted')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_marketplace_updated_at
  before update on public.marketplace_items
  for each row execute procedure public.set_updated_at();

-- ─────────────────────────────────────────────
-- 9. CONVERSATIONS & MESSAGES
-- FIX: welcome message was inserting `receiver_id` which doesn't exist.
--      Messages are scoped to a conversation via conversation_id only.
--      Added `participants` view so messages.tsx c.participants works.
-- ─────────────────────────────────────────────
create table public.conversations (
  id         uuid        primary key default uuid_generate_v4(),
  user1_id   uuid        not null references public.profiles(id) on delete cascade,
  user2_id   uuid        not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user1_id, user2_id)
);

create table public.messages (
  id              uuid        primary key default uuid_generate_v4(),
  conversation_id uuid        not null references public.conversations(id) on delete cascade,
  sender_id       uuid        not null references public.profiles(id) on delete cascade,
  content         text        not null,
  read            boolean     not null default false,
  created_at      timestamptz not null default now()
  -- NOTE: NO receiver_id column — scoped by conversation only
);

-- View so messages.tsx `c.participants` works correctly
create or replace view public.conversations_with_participants as
  select
    c.id,
    c.created_at,
    json_build_array(
      row_to_json(p1),
      row_to_json(p2)
    ) as participants
  from public.conversations c
  join public.profiles p1 on p1.id = c.user1_id
  join public.profiles p2 on p2.id = c.user2_id;

-- ─────────────────────────────────────────────
-- 10. NOTIFICATIONS
-- ─────────────────────────────────────────────
create table public.notifications (
  id         uuid        primary key default uuid_generate_v4(),
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  title      text        not null,
  body       text,
  type       text        not null default 'info'
               check (type in ('info','booking','job','message','review','emergency','system','welcome')),
  read       boolean     not null default false,
  link       text,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- 11. EMERGENCY SERVICES
-- ─────────────────────────────────────────────
create table public.emergency_services (
  id         uuid         primary key default uuid_generate_v4(),
  worker_id  uuid         not null references public.profiles(id) on delete cascade,
  name       text         not null,
  phone      text         not null,
  whatsapp   text,
  category   text         not null,
  location   text         not null,
  available  boolean      not null default true,
  rating     numeric(3,2) not null default 0,
  created_at timestamptz  not null default now()
);

-- ─────────────────────────────────────────────
-- 12. EMERGENCY REQUESTS
-- ─────────────────────────────────────────────
create table public.emergency_requests (
  id           uuid        primary key default uuid_generate_v4(),
  requester_id uuid        references public.profiles(id) on delete set null,
  type         text        not null,
  location     text        not null,
  description  text,
  status       text        not null default 'open'
                             check (status in ('open','assigned','resolved')),
  created_at   timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- 13. STORAGE BUCKETS
-- ─────────────────────────────────────────────

-- avatars: profile photos uploaded via settings page
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- marketplace: item photos
insert into storage.buckets (id, name, public)
values ('marketplace', 'marketplace', true)
on conflict (id) do nothing;

-- services: service photos
insert into storage.buckets (id, name, public)
values ('services', 'services', true)
on conflict (id) do nothing;

-- ─────────────────────────────────────────────
-- 14. ROW LEVEL SECURITY — Enable on all tables
-- ─────────────────────────────────────────────
alter table public.profiles           enable row level security;
alter table public.services           enable row level security;
alter table public.bookings           enable row level security;
alter table public.reviews            enable row level security;
alter table public.jobs               enable row level security;
alter table public.applications       enable row level security;
alter table public.marketplace_items  enable row level security;
alter table public.conversations      enable row level security;
alter table public.messages           enable row level security;
alter table public.notifications      enable row level security;
alter table public.emergency_services enable row level security;
alter table public.emergency_requests enable row level security;

-- ── PROFILES ─────────────────────────────────
create policy "profiles: public read"
  on public.profiles for select using (true);

create policy "profiles: owner update"
  on public.profiles for update
  using (auth.uid() = id);

create policy "profiles: admin update"
  on public.profiles for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "profiles: admin delete"
  on public.profiles for delete
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ── SERVICES ─────────────────────────────────
create policy "services: public read"
  on public.services for select using (true);

create policy "services: worker insert"
  on public.services for insert
  with check (auth.uid() = worker_id);

create policy "services: worker update"
  on public.services for update
  using (auth.uid() = worker_id);

create policy "services: admin update"
  on public.services for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "services: worker delete"
  on public.services for delete
  using (auth.uid() = worker_id);

-- ── BOOKINGS ─────────────────────────────────
create policy "bookings: customer or worker read"
  on public.bookings for select
  using (
    auth.uid() = customer_id or
    auth.uid() = (select worker_id from public.services where id = service_id)
  );

create policy "bookings: customer insert"
  on public.bookings for insert
  with check (auth.uid() = customer_id);

create policy "bookings: parties update"
  on public.bookings for update
  using (
    auth.uid() = customer_id or
    auth.uid() = (select worker_id from public.services where id = service_id)
  );

-- ── REVIEWS ──────────────────────────────────
create policy "reviews: public read"
  on public.reviews for select using (true);

create policy "reviews: reviewer insert"
  on public.reviews for insert
  with check (auth.uid() = reviewer_id);

create policy "reviews: reviewer delete"
  on public.reviews for delete
  using (auth.uid() = reviewer_id);

-- ── JOBS ─────────────────────────────────────
create policy "jobs: public read"
  on public.jobs for select using (true);

create policy "jobs: poster insert"
  on public.jobs for insert
  with check (auth.uid() = poster_id);

create policy "jobs: poster update"
  on public.jobs for update
  using (auth.uid() = poster_id);

create policy "jobs: admin update"
  on public.jobs for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ── APPLICATIONS ─────────────────────────────
create policy "applications: poster or applicant read"
  on public.applications for select
  using (
    auth.uid() = applicant_id or
    auth.uid() = (select poster_id from public.jobs where id = job_id)
  );

create policy "applications: worker insert"
  on public.applications for insert
  with check (auth.uid() = applicant_id);

create policy "applications: poster update status"
  on public.applications for update
  using (auth.uid() = (select poster_id from public.jobs where id = job_id));

-- ── MARKETPLACE ──────────────────────────────
create policy "marketplace_items: public read"
  on public.marketplace_items for select using (true);

create policy "marketplace_items: seller insert"
  on public.marketplace_items for insert
  with check (auth.uid() = seller_id);

create policy "marketplace_items: seller update"
  on public.marketplace_items for update
  using (auth.uid() = seller_id);

create policy "marketplace_items: seller delete"
  on public.marketplace_items for delete
  using (auth.uid() = seller_id);

-- ── CONVERSATIONS ────────────────────────────
create policy "conversations: participants read"
  on public.conversations for select
  using (auth.uid() = user1_id or auth.uid() = user2_id);

create policy "conversations: authenticated insert"
  on public.conversations for insert
  with check (auth.uid() = user1_id or auth.uid() = user2_id);

-- ── MESSAGES ─────────────────────────────────
create policy "messages: conversation participants read"
  on public.messages for select
  using (
    auth.uid() in (
      select user1_id from public.conversations where id = conversation_id
      union
      select user2_id from public.conversations where id = conversation_id
    )
  );

create policy "messages: sender insert"
  on public.messages for insert
  with check (auth.uid() = sender_id);

create policy "messages: sender mark read"
  on public.messages for update
  using (
    auth.uid() in (
      select user1_id from public.conversations where id = conversation_id
      union
      select user2_id from public.conversations where id = conversation_id
    )
  );

-- ── NOTIFICATIONS ────────────────────────────
create policy "notifications: own read"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "notifications: own update"
  on public.notifications for update
  using (auth.uid() = user_id);

create policy "notifications: own or service insert"
  on public.notifications for insert
  with check (auth.uid() = user_id or auth.role() = 'service_role');

-- ── EMERGENCY SERVICES ───────────────────────
create policy "emergency_services: public read"
  on public.emergency_services for select using (true);

create policy "emergency_services: worker manage"
  on public.emergency_services for all
  using (auth.uid() = worker_id);

-- ── EMERGENCY REQUESTS ───────────────────────
create policy "emergency_requests: own read"
  on public.emergency_requests for select
  using (auth.uid() = requester_id);

create policy "emergency_requests: authenticated insert"
  on public.emergency_requests for insert
  with check (auth.uid() = requester_id or requester_id is null);

-- ─────────────────────────────────────────────
-- 15. STORAGE POLICIES
-- ─────────────────────────────────────────────

-- avatars bucket — profile photos
drop policy if exists "avatars: public read"   on storage.objects;
drop policy if exists "avatars: owner upload"  on storage.objects;
drop policy if exists "avatars: owner update"  on storage.objects;
drop policy if exists "avatars: owner delete"  on storage.objects;

create policy "avatars: public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars: owner upload"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "avatars: owner update"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "avatars: owner delete"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- marketplace bucket — item photos
drop policy if exists "marketplace: public read"  on storage.objects;
drop policy if exists "marketplace: auth upload"  on storage.objects;
drop policy if exists "marketplace: auth delete"  on storage.objects;

create policy "marketplace: public read"
  on storage.objects for select
  using (bucket_id = 'marketplace');

create policy "marketplace: auth upload"
  on storage.objects for insert
  with check (
    bucket_id = 'marketplace'
    and auth.role() = 'authenticated'
  );

create policy "marketplace: auth delete"
  on storage.objects for delete
  using (
    bucket_id = 'marketplace'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- services bucket — service photos
drop policy if exists "services: public read storage"  on storage.objects;
drop policy if exists "services: auth upload"          on storage.objects;
drop policy if exists "services: auth delete"          on storage.objects;

create policy "services: public read storage"
  on storage.objects for select
  using (bucket_id = 'services');

create policy "services: auth upload"
  on storage.objects for insert
  with check (
    bucket_id = 'services'
    and auth.role() = 'authenticated'
  );

create policy "services: auth delete"
  on storage.objects for delete
  using (
    bucket_id = 'services'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ─────────────────────────────────────────────
-- 16. INDEXES
-- ─────────────────────────────────────────────
create index if not exists idx_services_worker   on public.services(worker_id);
create index if not exists idx_services_category on public.services(category);
create index if not exists idx_services_location on public.services(location);
create index if not exists idx_services_status   on public.services(status);

create index if not exists idx_jobs_poster   on public.jobs(poster_id);
create index if not exists idx_jobs_location on public.jobs(location);
create index if not exists idx_jobs_status   on public.jobs(status);
create index if not exists idx_jobs_urgent   on public.jobs(is_urgent);

create index if not exists idx_bookings_service  on public.bookings(service_id);
create index if not exists idx_bookings_customer on public.bookings(customer_id);

create index if not exists idx_applications_job  on public.applications(job_id);
create index if not exists idx_applications_user on public.applications(applicant_id);

create index if not exists idx_reviews_service on public.reviews(service_id);
create index if not exists idx_reviews_worker  on public.reviews(worker_id);

create index if not exists idx_marketplace_seller on public.marketplace_items(seller_id);
create index if not exists idx_marketplace_cat    on public.marketplace_items(category);

create index if not exists idx_messages_conv   on public.messages(conversation_id);
create index if not exists idx_messages_sender on public.messages(sender_id);

create index if not exists idx_notifications_user on public.notifications(user_id);
create index if not exists idx_notifications_read on public.notifications(user_id, read);

create index if not exists idx_emergency_avail on public.emergency_services(available, category);

-- ─────────────────────────────────────────────
-- DONE ✓  BlinkBuy Schema v3
--
-- CHANGES vs v2:
--  [8] handle_new_user_welcome() — new function + trigger
--        fires after insert on public.profiles
--        creates admin↔user conversation, welcome message, bell notification
--        admin resolved by email (never hardcoded UUID in frontend)
--        uses ON CONFLICT DO NOTHING to be idempotent
--  [9] notifications.type check — added 'welcome' to allowed values
--      (your function was inserting 'welcome'; old constraint would reject it)
-- [10] notifications insert — fixed column: `message` → `body`
--      (schema has `body`; original function referenced non-existent `message`)
--
-- BUGS FIXED vs v1:
--  [1] jobs.poster_id  — was `posted_by` in api.ts POST /jobs
--  [2] messages        — removed non-existent receiver_id
--                        (welcome msg in useAuth will now gracefully fail
--                         until code is updated to use conversations)
--  [3] services        — price_type / is_online / price_display
--                        (code sent camelCase; DB now documents correct names)
--  [4] profiles        — profile_photo snake_case (settings sends camelCase;
--                        need api.put to remap — see note below)
--  [5] conversations   — added participants view so messages.tsx works
--  [6] storage         — added update + delete policies (were missing)
--  [7] updated_at      — auto-trigger on all mutable tables
--
-- ONE CODE FIX STILL NEEDED (not fixable in SQL):
--   settings.tsx sends { profilePhoto } → api.put must map to { profile_photo }
--   post-service.tsx sends { priceType, isOnline, priceDisplay }
--     → api.ts /services POST must remap to snake_case before insert
-- ─────────────────────────────────────────────
