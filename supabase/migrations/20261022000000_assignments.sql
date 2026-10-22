-- Speaking assignments: a teacher picks words, how many to draw, a speaking time, an optional due
-- day and some students. Sessions a student starts from an assignment are linked to it, and
-- whether they've done it is worked out from those sessions (see src/lib/assignments.ts).
--
-- Access rules, enforced by row-level security:
--   * teachers read every assignment; only the teacher who made one can change or delete it;
--   * a student reads only the assignments given to them, and never sees who else got them;
--   * a student can link a practice session only to an assignment given to them, and only
--     when saving it: the link can't be changed afterwards.

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  instructions text not null default '' check (char_length(instructions) <= 5000),
  -- Copies of the teacher's words ({id, word, reading, meaning}): students can't read the
  -- teacher's own, and later edits to those shouldn't change work already given out.
  words jsonb not null check (jsonb_typeof(words) = 'array' and jsonb_array_length(words) >= 1),
  -- How many of the words each attempt draws.
  word_count integer not null check (word_count >= 1 and word_count <= jsonb_array_length(words)),
  -- The app's MIN_SPEECH_SECONDS and MAX_SPEECH_SECONDS.
  time_limit_sec integer not null check (time_limit_sec between 10 and 3659),
  -- To be done by the end of this day, if set.
  due_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index assignments_created_at on public.assignments (created_at desc);

create table public.assignment_students (
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (assignment_id, student_id)
);

create index assignment_students_student on public.assignment_students (student_id);

-- Whether the assignment is given to the signed-in account. Security definer, like is_teacher(),
-- so the policies below can use it without the two tables' policies checking each other in a loop.
create function public.is_assigned(assignment uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.assignment_students
    where assignment_id = assignment and student_id = (select auth.uid())
  );
$$;

-- Deleting an assignment keeps the sessions done for it; they just stop being linked.
alter table public.practices
  add column assignment_id uuid references public.assignments (id) on delete set null;

create index practices_assignment on public.practices (assignment_id) where assignment_id is not null;

alter table public.assignments enable row level security;
alter table public.assignment_students enable row level security;

create policy "Read assignments given to you, or any as a teacher" on public.assignments
  for select to authenticated
  using ((select public.is_teacher()) or public.is_assigned(id));
create policy "Teachers add assignments" on public.assignments
  for insert to authenticated
  with check ((select public.is_teacher()) and teacher_id = (select auth.uid()));
create policy "Change own assignments" on public.assignments
  for update to authenticated
  using ((select public.is_teacher()) and teacher_id = (select auth.uid()))
  with check (teacher_id = (select auth.uid()));
create policy "Delete own assignments" on public.assignments
  for delete to authenticated
  using ((select public.is_teacher()) and teacher_id = (select auth.uid()));

create policy "Read own place on an assignment, or any as a teacher" on public.assignment_students
  for select to authenticated
  using (student_id = (select auth.uid()) or (select public.is_teacher()));
create policy "Give out own assignments" on public.assignment_students
  for insert to authenticated
  with check (
    (select public.is_teacher())
    and exists (select 1 from public.assignments a where a.id = assignment_id and a.teacher_id = (select auth.uid()))
  );
create policy "Take back own assignments" on public.assignment_students
  for delete to authenticated
  using (
    (select public.is_teacher())
    and exists (select 1 from public.assignments a where a.id = assignment_id and a.teacher_id = (select auth.uid()))
  );

drop policy "Add own practice" on public.practices;
create policy "Add own practice" on public.practices
  for insert to authenticated
  with check (owner_id = (select auth.uid()) and (assignment_id is null or public.is_assigned(assignment_id)));

-- The link is set only when a session is saved. Restoring a backup updates sessions that are
-- already there without touching it, even if the student has since been taken off the assignment.
revoke update on public.practices from authenticated;
grant update (owner_id, id, started_at, ended_at, time_limit_sec, spoken_sec, ended_early, notes, words)
  on public.practices to authenticated;

revoke all on public.assignments, public.assignment_students from anon, authenticated;
grant select, insert, delete on public.assignments, public.assignment_students to authenticated;
grant update (title, instructions, words, word_count, time_limit_sec, due_on, updated_at)
  on public.assignments to authenticated;

-- Used by the policies, so it must stay callable by signed-in accounts.
revoke execute on function public.is_assigned(uuid) from public, anon;
grant execute on function public.is_assigned(uuid) to authenticated;
