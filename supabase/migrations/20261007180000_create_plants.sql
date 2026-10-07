-- Plant collection owned by each signed-in user.
create table public.plants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 80),
  species text check (char_length(species) <= 120),
  location text not null default 'indoor' check (location in ('indoor', 'outdoor')),
  sun_exposure text not null default 'bright_indirect'
    check (sun_exposure in ('full_sun', 'partial_sun', 'bright_indirect', 'low_light')),
  planted_on date,
  notes text check (char_length(notes) <= 1000),
  created_at timestamptz not null default now()
);

create index plants_user_id_created_at_idx on public.plants (user_id, created_at desc);

alter table public.plants enable row level security;

grant select, insert, update, delete on public.plants to authenticated;

create policy "Users can view their own plants"
  on public.plants for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can add their own plants"
  on public.plants for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own plants"
  on public.plants for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own plants"
  on public.plants for delete
  to authenticated
  using ((select auth.uid()) = user_id);
