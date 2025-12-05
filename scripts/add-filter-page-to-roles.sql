-- SQL Script to add 'filter' page to existing admin/superadmin role_pages
-- Run this in your backend database if users have rolePages stored in database
-- This replaces the old 'configuration' page reference with 'filter'

-- Option 1: If you store role_pages as a JSON array in users table
-- First remove old 'configuration' if it exists
-- UPDATE users
-- SET role_pages = role_pages - 'configuration'
-- WHERE role IN ('superadmin', 'admin')
-- AND role_pages ? 'configuration';

-- Then add 'filter'
-- UPDATE users
-- SET role_pages = jsonb_insert(
--   COALESCE(role_pages, '[]'::jsonb),
--   '{0}',
--   '"filter"'::jsonb
-- )
-- WHERE role IN ('superadmin', 'admin')
-- AND (role_pages IS NULL OR NOT role_pages ? 'filter');

-- Option 2: If you have a separate roles table with pages
-- First remove old 'configuration' if it exists
-- UPDATE roles
-- SET pages = array_remove(pages, 'configuration')
-- WHERE name IN ('SuperAdmin', 'Admin')
-- AND 'configuration' = ANY(pages);

-- Then add 'filter'
-- UPDATE roles
-- SET pages = array_append(pages, 'filter')
-- WHERE name IN ('SuperAdmin', 'Admin')
-- AND NOT ('filter' = ANY(pages));

-- Option 3: If using a junction table (role_pages table)
-- First remove old 'configuration' if it exists
-- DELETE FROM role_pages
-- WHERE page_id = 'configuration'
-- AND role_id IN (SELECT id FROM roles WHERE name IN ('SuperAdmin', 'Admin'));

-- Then add 'filter'
-- INSERT INTO role_pages (role_id, page_id)
-- SELECT r.id, 'filter'
-- FROM roles r
-- WHERE r.name IN ('SuperAdmin', 'Admin')
-- AND NOT EXISTS (
--   SELECT 1 FROM role_pages rp
--   WHERE rp.role_id = r.id AND rp.page_id = 'filter'
-- );

-- Note:
-- 1. Adjust the above queries based on your actual database schema
-- 2. The frontend (useUserPages.ts) ensures superadmins always see all admin pages
-- 3. If you're seeing issues, try refreshing the page or clearing browser cache
