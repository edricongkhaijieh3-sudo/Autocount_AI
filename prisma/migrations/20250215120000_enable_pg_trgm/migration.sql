-- Enable pg_trgm for fuzzy text search (e.g. customer name matching).
-- Required for search_customer and invoice creation customer lookup.
-- Neon: run this via SQL Editor or: npx prisma migrate deploy
CREATE EXTENSION IF NOT EXISTS pg_trgm;
