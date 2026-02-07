-- LiveCity Initial Schema
-- Enables vector support for semantic search
create extension if not exists vector with schema extensions;

-- ============================================
-- ENUMS
-- ============================================

create type user_role as enum ('user', 'business');
create type subscription_tier as enum ('free', 'premium');
create type business_tier as enum ('free', 'pro');
create type booking_status as enum ('pending', 'accepted', 'rejected', 'cancelled');
create type venue_claim_status as enum ('unclaimed', 'claimed', 'verified');

-- ============================================
-- PROFILES (extends Supabase auth.users)
-- ============================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'user',
  full_name text,
  avatar_url text,
  subscription_tier subscription_tier not null default 'free',
  -- User preferences
  has_children boolean default false,
  has_pets boolean default false,
  has_car boolean default false,
  preferred_locale text default 'ru',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- VENUES (places / businesses)
-- ============================================

create table public.venues (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete set null,

  -- Basic info
  name text not null,
  slug text unique not null,
  description text,
  category text not null, -- e.g. 'restaurant', 'park', 'cafe', 'shop'
  subcategory text,       -- e.g. 'bbq', 'playground', 'coffee'
  phone text,
  whatsapp text,
  website text,

  -- Geolocation
  latitude double precision not null,
  longitude double precision not null,
  address text,
  city text not null,

  -- Live Score system
  live_score numeric(4,2) default 5.00,  -- 0.00 to 10.00
  live_score_updated_at timestamptz default now(),
  review_count integer default 0,

  -- AI-generated summary for vector search
  ai_summary text,
  embedding vector(1536),  -- OpenAI ada-002 embedding dimension

  -- Tags extracted by AI
  tags text[] default '{}',

  -- Business claiming
  claim_status venue_claim_status not null default 'unclaimed',
  business_tier business_tier not null default 'free',

  -- Media
  cover_image_url text,
  images text[] default '{}',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for geo queries
create index idx_venues_location on public.venues using gist (
  ll_to_earth(latitude, longitude)
);
create index idx_venues_city on public.venues(city);
create index idx_venues_category on public.venues(category);
create index idx_venues_live_score on public.venues(live_score desc);
create index idx_venues_slug on public.venues(slug);

-- Vector similarity search index
create index idx_venues_embedding on public.venues
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- ============================================
-- REVIEWS_ANALYZED (processed social mentions)
-- ============================================

create table public.reviews_analyzed (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,

  -- Source info
  source text not null,        -- 'instagram', 'tiktok', 'google_maps', 'manual'
  source_url text,
  source_author text,
  original_text text not null,

  -- AI analysis results
  sentiment numeric(3,2) not null,  -- -1.00 to 1.00
  tags text[] default '{}',          -- e.g. {'food_quality', 'service_speed', 'ambiance'}
  ai_summary text,

  -- Freshness weight (calculated by cron)
  freshness_weight numeric(3,2) default 1.00,  -- 0.10 to 2.00

  published_at timestamptz not null default now(),
  analyzed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index idx_reviews_venue on public.reviews_analyzed(venue_id);
create index idx_reviews_published on public.reviews_analyzed(published_at desc);
create index idx_reviews_source on public.reviews_analyzed(source);

-- ============================================
-- BOOKINGS (direct booking requests)
-- ============================================

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,

  status booking_status not null default 'pending',

  -- Booking details
  requested_date date not null,
  requested_time time,
  party_size integer default 1,
  message text,

  -- Business response
  business_response text,
  responded_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_bookings_venue on public.bookings(venue_id);
create index idx_bookings_user on public.bookings(user_id);
create index idx_bookings_status on public.bookings(status);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to search venues by vector similarity
create or replace function match_venues(
  query_embedding vector(1536),
  match_threshold float default 0.7,
  match_count int default 10,
  filter_city text default null
)
returns table (
  id uuid,
  name text,
  category text,
  latitude double precision,
  longitude double precision,
  live_score numeric,
  ai_summary text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    v.id,
    v.name,
    v.category,
    v.latitude,
    v.longitude,
    v.live_score,
    v.ai_summary,
    1 - (v.embedding <=> query_embedding) as similarity
  from public.venues v
  where
    1 - (v.embedding <=> query_embedding) > match_threshold
    and (filter_city is null or v.city = filter_city)
  order by v.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Function to recalculate live_score for a venue
create or replace function recalculate_live_score(target_venue_id uuid)
returns numeric
language plpgsql
as $$
declare
  new_score numeric(4,2);
begin
  select
    coalesce(
      -- Weighted average: sentiment mapped from [-1,1] to [0,10], weighted by freshness
      round(
        (sum((r.sentiment + 1) * 5 * r.freshness_weight) / nullif(sum(r.freshness_weight), 0))::numeric,
        2
      ),
      5.00
    )
  into new_score
  from public.reviews_analyzed r
  where r.venue_id = target_venue_id;

  update public.venues
  set
    live_score = new_score,
    live_score_updated_at = now(),
    review_count = (select count(*) from public.reviews_analyzed where venue_id = target_venue_id)
  where id = target_venue_id;

  return new_score;
end;
$$;

-- Trigger: auto-update updated_at
create or replace function update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger venues_updated_at
  before update on public.venues
  for each row execute function update_updated_at();

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function update_updated_at();

create trigger bookings_updated_at
  before update on public.bookings
  for each row execute function update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table public.profiles enable row level security;
alter table public.venues enable row level security;
alter table public.reviews_analyzed enable row level security;
alter table public.bookings enable row level security;

-- Profiles: users can read all, update own
create policy "Public profiles readable" on public.profiles
  for select using (true);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Venues: readable by all, editable by owner
create policy "Venues are publicly readable" on public.venues
  for select using (true);
create policy "Business owners can update own venues" on public.venues
  for update using (auth.uid() = owner_id);
create policy "Business owners can insert venues" on public.venues
  for insert with check (auth.uid() = owner_id);

-- Reviews: readable by all (business sees full text if Pro)
create policy "Reviews are publicly readable" on public.reviews_analyzed
  for select using (true);

-- Bookings: users see own, business sees own venue's
create policy "Users can see own bookings" on public.bookings
  for select using (auth.uid() = user_id);
create policy "Business sees venue bookings" on public.bookings
  for select using (
    exists (
      select 1 from public.venues v
      where v.id = venue_id and v.owner_id = auth.uid()
    )
  );
create policy "Users can create bookings" on public.bookings
  for insert with check (auth.uid() = user_id);
create policy "Business can update booking status" on public.bookings
  for update using (
    exists (
      select 1 from public.venues v
      where v.id = venue_id and v.owner_id = auth.uid()
    )
  );
