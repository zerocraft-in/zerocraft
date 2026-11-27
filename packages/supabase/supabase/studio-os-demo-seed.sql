-- Zerocraft Studio OS demo data
-- Run in the Supabase SQL editor after the studio foundation migrations.
-- This is idempotent and supports both studio_* and the store-only commerce_* names.

do $$
declare
  leads_table text;
  projects_table text;
begin
  leads_table := case
    when to_regclass('public.studio_leads') is not null then 'studio_leads'
    when to_regclass('public.commerce_leads') is not null then 'commerce_leads'
    else null
  end;

  projects_table := case
    when to_regclass('public.studio_projects') is not null then 'studio_projects'
    when to_regclass('public.commerce_projects') is not null then 'commerce_projects'
    else null
  end;

  if leads_table is not null then
    execute format($sql$
      insert into public.%I (id, name, email, phone, company, stage, source, service_interest, next_action, notes)
      values
        ('10000000-0000-4000-8000-000000000001', 'Alex Vance', 'alex@aestheticlabs.io', '+1 415 555 0132', 'Aesthetic Labs', 'new', 'website', 'Brand + Commerce', 'Review brief', 'Generative typography-led streetwear launch.'),
        ('10000000-0000-4000-8000-000000000002', 'Maya Chen', 'maya@northstar.health', '+1 415 555 0133', 'Northstar Health', 'contacted', 'referral', 'Digital product', 'Send availability', 'Patient education platform and service design.'),
        ('10000000-0000-4000-8000-000000000003', 'Marcus Aurel', 'marcus@kinetix.design', '+1 415 555 0134', 'Kinetix Studio', 'qualified', 'instagram', 'Spatial showroom', 'Book discovery', 'Interactive product visualizer with a mobile-first fallback.'),
        ('10000000-0000-4000-8000-000000000004', 'Priya Nair', 'priya@fieldnotes.co', '+1 415 555 0135', 'Field Notes Co.', 'proposal', 'newsletter', 'Campaign system', 'Follow up Friday', 'Seasonal campaign platform and editorial toolkit.')
      on conflict (id) do update set
        stage = excluded.stage,
        service_interest = excluded.service_interest,
        next_action = excluded.next_action,
        notes = excluded.notes,
        updated_at = now()
    $sql$, leads_table);
  end if;

  if projects_table is not null then
    execute format($sql$
      insert into public.%I (id, name, status, description, deadline, budget)
      values
        ('20000000-0000-4000-8000-000000000001', 'Cinder / Brand launch', 'active', 'Cinder Coffee Co. · Brand identity, packaging, and launch campaign.', '2026-11-14', 18400),
        ('20000000-0000-4000-8000-000000000002', 'Aster digital platform', 'review', 'Aster Financial · Product strategy and responsive platform system.', '2026-11-08', 32000),
        ('20000000-0000-4000-8000-000000000003', 'Kinetix spatial system', 'planning', 'Kinetix Studio · Spatial showroom and product storytelling system.', '2026-12-02', 42000)
      on conflict (id) do update set
        status = excluded.status,
        description = excluded.description,
        deadline = excluded.deadline,
        budget = excluded.budget,
        updated_at = now()
    $sql$, projects_table);
  end if;
end $$;

notify pgrst, 'reload schema';
