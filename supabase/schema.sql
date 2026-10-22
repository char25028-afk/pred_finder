-- ============================================================================
-- PRED FINDER (匿名プレデター特定DB & 掲示板) - Supabase Schema & Initial Seed
-- Supabaseの「SQL Editor」にこのファイルの中身を丸ごと貼り付けて「Run」するだけで構築完了します。
-- ============================================================================

-- 1. プレイヤー基本情報テーブル (players)
create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  current_name text not null,
  aliases text[] default '{}',
  platform text not null default 'PC',
  input_device text default 'Unknown',
  main_legends text[] default '{}',
  x_url text,
  twitch_url text,
  youtube_url text,
  tracker_url text,
  bio_note text,
  created_at timestamptz not null default now()
);

-- 2. シーズン別プレデター順位レコード (predator_records)
create table if not exists public.predator_records (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  season int not null,
  rank int not null check (rank >= 1 and rank <= 750),
  split_type text not null default 'both', -- 'both' (両スプ発光), 'split1', 'split2', 'full'
  recorded_ign text not null,
  rp_score int,
  platform text not null default 'PC',
  verified_count int not null default 1,
  created_at timestamptz not null default now()
);

-- 3. 情報提供・目撃掲示板テーブル (sightings_posts)
create table if not exists public.sightings_posts (
  id uuid primary key default gen_random_uuid(),
  season int not null,
  rank int,
  split_type text not null default 'unknown',
  platform text not null default 'PC',
  post_type text not null default 'identify', -- 'identify' (情報提供), 'sighting' (目撃報告), 'question' (特定依頼)
  suspect_player_name text,
  other_badges int[] default '{}',
  legend_used text,
  comment text not null,
  author_name text not null default '名無しのレジェンド',
  x_url text,
  tracker_url text,
  likes int not null default 0,
  created_at timestamptz not null default now()
);

-- インデックス作成（シーズン×順位×機種の高速検索用）
create index if not exists idx_predator_records_season_rank on public.predator_records(season, rank, platform);
create index if not exists idx_sightings_posts_season_rank on public.sightings_posts(season, rank);

-- RLS (Row Level Security) 設定：誰でも閲覧・情報提供投稿ができるように開放
alter table public.players enable row level security;
alter table public.predator_records enable row level security;
alter table public.sightings_posts enable row level security;

create policy "Allow public read on players" on public.players for select using (true);
create policy "Allow public insert on players" on public.players for insert with check (true);
create policy "Allow public update on players" on public.players for update using (true);

create policy "Allow public read on predator_records" on public.predator_records for select using (true);
create policy "Allow public insert on predator_records" on public.predator_records for insert with check (true);
create policy "Allow public update on predator_records" on public.predator_records for update using (true);

create policy "Allow public read on sightings_posts" on public.sightings_posts for select using (true);
create policy "Allow public insert on sightings_posts" on public.sightings_posts for insert with check (true);
create policy "Allow public update on sightings_posts" on public.sightings_posts for update using (true);
