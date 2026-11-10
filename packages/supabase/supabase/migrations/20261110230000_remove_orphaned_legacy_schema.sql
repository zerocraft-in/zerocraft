-- The legacy schema contained only old, unreferenced helper functions.
-- Public store tables remain in place because the CMS still uses them.
drop schema if exists legacy_maara_20261101 cascade;
