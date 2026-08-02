-- Aggregated public statistics for the ending page.
-- Run this once in the Supabase SQL editor.
-- It exposes counts only; no player profile or location data is returned.

create or replace function public.get_game_result_distribution()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with totals as (
    select count(*)::bigint as total
    from public.game_results
  ),
  ending_counts as (
    select ending_title as title, count(*)::bigint as count
    from public.game_results
    where ending_title is not null
    group by ending_title
  ),
  offer_counts as (
    select offer_name as name, count(*)::bigint as count
    from public.game_results
    where offer_name is not null and btrim(offer_name) <> ''
    group by offer_name
  )
  select jsonb_build_object(
    'total', totals.total,
    'endings', coalesce(
      (select jsonb_agg(jsonb_build_object('title', title, 'count', count) order by count desc) from ending_counts),
      '[]'::jsonb
    ),
    'offers', coalesce(
      (select jsonb_agg(jsonb_build_object('name', name, 'count', count) order by count desc) from offer_counts),
      '[]'::jsonb
    )
  )
  from totals;
$$;

revoke all on function public.get_game_result_distribution() from public;
grant execute on function public.get_game_result_distribution() to anon, authenticated;

