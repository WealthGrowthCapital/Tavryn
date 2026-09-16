insert into public.tools (slug, name, description, route, source_license, license_verified, is_published)
values
  ('unit-conversion','Unit Conversion','Convert common length, mass, temperature, area, volume, and speed units instantly.','/tools/unit-conversion','Original implementation',true,true),
  ('percentage-calculator','Percentage Calculator','Calculate a percentage of a number quickly and clearly.','/tools/percentage-calculator','Original implementation',true,true),
  ('lease-escalation-calculator','Lease Escalation Calculator','Calculate the next lease amount after a percentage escalation.','/tools/lease-escalation-calculator','Original implementation',true,true)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  route = excluded.route,
  source_license = excluded.source_license,
  license_verified = excluded.license_verified,
  is_published = excluded.is_published,
  updated_at = now();
