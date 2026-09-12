-- Exposes only the company name + logo publicly, so the sign-in page (shown
-- to people who aren't authenticated yet) can display real branding without
-- widening access to the rest of company_settings (which holds bank/UPI
-- details and must stay staff-only).

create or replace function public_branding()
returns table (company_name text, logo_url text)
language sql
security definer set search_path = public
stable
as $$
  select company_name, logo_url from company_settings where id = true;
$$;

grant execute on function public_branding() to anon, authenticated;
