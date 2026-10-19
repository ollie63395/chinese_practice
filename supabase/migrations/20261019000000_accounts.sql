-- Accounts, word banks and practice history.
--
-- Access rules, enforced by Postgres row-level security rather than by the app:
--   * everyone can read and change only their own words, pictures and practice history;
--   * teachers can also read (not change) everyone's;
--   * every new account is a student; only a teacher can make someone a teacher.

-- ---------------------------------------------------------------- Profiles

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  -- Set for accounts that sign in with a username instead of an email address.
  username text unique check (username ~ '^[a-z0-9._-]{3,30}$'),
  email text,
  role text not null default 'student' check (role in ('student', 'teacher')),
  created_at timestamptz not null default now()
);

comment on column public.profiles.username is
  'Username accounts are stored in auth.users under the made-up address <username>@users.cihui.invalid.';

-- Every sign-up gets a profile. Username accounts are recognised by their made-up address,
-- so the username can't be set to something other than what was registered.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  is_username boolean := new.email like '%@users.cihui.invalid';
begin
  insert into public.profiles (id, display_name, username, email)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1)), 80),
    case when is_username then split_part(new.email, '@', 1) end,
    case when is_username then null else new.email end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Security definer, so policies on profiles can use it without checking themselves recursively.
create function public.is_teacher()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'teacher');
$$;

alter table public.profiles enable row level security;

create policy "Read own profile, or any as a teacher" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_teacher()));

create policy "Rename own profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Profiles are created by the trigger and roles change through set_account_role(),
-- so the only column anyone may write directly is their own display name.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;

-- ---------------------------------------------------------------- Words and practice history

-- Ids are chosen by the app and only need to be unique per account, so everyone can restore
-- the same backup file (a word list a teacher hands out, say) without clashing.
create table public.words (
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  id text not null check (char_length(id) between 1 and 100),
  word text not null check (char_length(word) between 1 and 500),
  reading text not null check (char_length(reading) between 1 and 1000),
  meaning text not null check (char_length(meaning) between 1 and 5000),
  tags text[] not null default '{}',
  -- A picture in the word-images bucket, always inside the owner's own folder.
  image_path text check (image_path like owner_id::text || '/%'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, id)
);

create index words_owner_created_at on public.words (owner_id, created_at desc);

create table public.practices (
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  id text not null check (char_length(id) between 1 and 100),
  started_at timestamptz not null,
  ended_at timestamptz not null,
  time_limit_sec integer not null check (time_limit_sec >= 0),
  spoken_sec integer not null check (spoken_sec >= 0),
  ended_early boolean not null default false,
  notes text not null default '',
  -- Copies of the words as they were when practised, so history survives later edits.
  words jsonb not null default '[]' check (jsonb_typeof(words) = 'array'),
  primary key (owner_id, id)
);

create index practices_owner_started_at on public.practices (owner_id, started_at desc);

alter table public.words enable row level security;
alter table public.practices enable row level security;

create policy "Read own words, or any as a teacher" on public.words
  for select to authenticated
  using (owner_id = (select auth.uid()) or (select public.is_teacher()));
create policy "Add own words" on public.words
  for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy "Change own words" on public.words
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy "Delete own words" on public.words
  for delete to authenticated
  using (owner_id = (select auth.uid()));

create policy "Read own practice, or any as a teacher" on public.practices
  for select to authenticated
  using (owner_id = (select auth.uid()) or (select public.is_teacher()));
create policy "Add own practice" on public.practices
  for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy "Change own practice" on public.practices
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy "Delete own practice" on public.practices
  for delete to authenticated
  using (owner_id = (select auth.uid()));

revoke all on public.words, public.practices from anon;

-- One row per account with its totals, for the teacher's list of students. Security invoker,
-- so the policies above still apply: a student sees only their own row.
create view public.account_summaries
with (security_invoker = true)
as
select
  p.id,
  p.display_name,
  p.username,
  p.email,
  p.role,
  p.created_at,
  (select count(*) from public.words w where w.owner_id = p.id)::integer as word_count,
  (select count(*) from public.practices x where x.owner_id = p.id)::integer as practice_count,
  (select coalesce(sum(x.spoken_sec), 0) from public.practices x where x.owner_id = p.id)::integer as spoken_sec,
  (select max(x.started_at) from public.practices x where x.owner_id = p.id) as last_practice_at
from public.profiles p;

revoke all on public.account_summaries from anon, authenticated;
grant select on public.account_summaries to authenticated;

-- ---------------------------------------------------------------- Pictures

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('word-images', 'word-images', false, 5242880, array['image/*']);

-- Each account's pictures live in a folder named after its id: <owner id>/<picture id>.
create policy "Read own pictures, or any as a teacher" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'word-images'
    and ((storage.foldername(name))[1] = (select auth.uid()::text) or (select public.is_teacher()))
  );
create policy "Add own pictures" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'word-images' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "Replace own pictures" on storage.objects
  for update to authenticated
  using (bucket_id = 'word-images' and (storage.foldername(name))[1] = (select auth.uid()::text))
  with check (bucket_id = 'word-images' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "Delete own pictures" on storage.objects
  for delete to authenticated
  using (bucket_id = 'word-images' and (storage.foldername(name))[1] = (select auth.uid()::text));

-- ---------------------------------------------------------------- Teacher actions

-- Makes an account a teacher or a student. Teachers can't change their own role,
-- so there is always at least one teacher left to undo a mistake.
create function public.set_account_role(target uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_teacher() then
    raise exception 'Only teachers can change roles' using errcode = '42501';
  end if;
  if target = (select auth.uid()) then
    raise exception 'Teachers can''t change their own role' using errcode = '42501';
  end if;
  if new_role not in ('student', 'teacher') then
    raise exception 'Unknown role: %', new_role using errcode = '22023';
  end if;
  update public.profiles set role = new_role where id = target;
  if not found then
    raise exception 'No such account' using errcode = 'P0002';
  end if;
end;
$$;

-- Sets a new password for a student, e.g. one who signs in with a username and has no email
-- to reset it with. Same hashing as Supabase Auth (bcrypt).
create function public.reset_student_password(target uuid, new_password text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_teacher() then
    raise exception 'Only teachers can reset passwords' using errcode = '42501';
  end if;
  if char_length(new_password) < 6 then
    raise exception 'Passwords need at least 6 characters' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles where id = target and role = 'student') then
    raise exception 'Only a student''s password can be reset' using errcode = '42501';
  end if;
  update auth.users
  set encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf', 10)), updated_at = now()
  where id = target;
end;
$$;

revoke execute on function public.set_account_role(uuid, text), public.reset_student_password(uuid, text) from public, anon;
grant execute on function public.set_account_role(uuid, text), public.reset_student_password(uuid, text) to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
