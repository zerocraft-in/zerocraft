-- Make the recycle-bin columns immediately visible to PostgREST after migration.
notify pgrst, 'reload schema';
