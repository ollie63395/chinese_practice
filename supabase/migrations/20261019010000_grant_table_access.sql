-- Signed-in accounts may use the words and practice tables; the row-level security policies
-- in the accounts migration decide which rows. Local Supabase grants this on every new table by
-- default, but hosted projects may not, so grant it explicitly.

grant select, insert, update, delete on public.words, public.practices to authenticated;

-- Used by the policies, so it must stay callable by signed-in accounts.
grant execute on function public.is_teacher() to authenticated;
