-- ════════════════════════════════════════════════════════════════════════════
-- Cardinal OS — Public server discovery.
--
-- Public servers become visible to everyone (so they can be browsed and joined
-- without an invite code), while private servers stay invite-only. Member counts
-- for servers you're not in need a SECURITY DEFINER function because pod_members
-- is member-only RLS.
-- ════════════════════════════════════════════════════════════════════════════

-- Public servers are selectable by any authenticated user (private unchanged).
drop policy if exists "pods_select" on public.pods;
create policy "pods_select" on public.pods for select
  using (
    created_by = auth.uid()
    or public.is_pod_member(id)
    or visibility = 'public'
  );

-- Directory listing: public servers + member counts, searchable.
create or replace function public.list_public_servers(p_search text default null)
returns table (
  id           uuid,
  name         text,
  description  text,
  icon_url     text,
  member_count bigint,
  created_at   timestamptz
)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.description, p.icon_url,
         (select count(*) from public.pod_members m where m.pod_id = p.id) as member_count,
         p.created_at
  from public.pods p
  where p.visibility = 'public'
    and (
      p_search is null or p_search = ''
      or p.name ilike '%' || p_search || '%'
      or coalesce(p.description, '') ilike '%' || p_search || '%'
    )
  order by member_count desc, p.created_at desc
  limit 60;
$$;

-- Join a public server directly (no invite code), respecting member_cap.
create or replace function public.join_pod_public(p_pod uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_count int; v_cap int; v_vis text;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  select member_cap, visibility into v_cap, v_vis from public.pods where id = p_pod;
  if v_vis is null then raise exception 'Server not found'; end if;
  if v_vis <> 'public' then raise exception 'This server is private - use an invite code.'; end if;
  if exists (select 1 from public.pod_members where pod_id = p_pod and user_id = auth.uid()) then
    return p_pod;
  end if;
  select count(*) into v_count from public.pod_members where pod_id = p_pod;
  if v_count >= coalesce(v_cap, 100) then raise exception 'This server is full.'; end if;
  insert into public.pod_members (pod_id, user_id) values (p_pod, auth.uid());
  return p_pod;
end;
$$;

grant execute on function public.list_public_servers(text) to authenticated;
grant execute on function public.join_pod_public(uuid) to authenticated;
