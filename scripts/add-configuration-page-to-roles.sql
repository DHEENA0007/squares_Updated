-- SQL Script to add 'configuration' page to existing admin/superadmin role_pages
-- Run this in your backend database if users have rolePages stored in database

-- Option 1: If you store role_pages as a JSON array in users table
-- UPDATE users
-- SET role_pages = jsonb_insert(
--   COALESCE(role_pages, '[]'::jsonb),
--   '{0}',
--   '"configuration"'::jsonb
-- )
-- WHERE role IN ('superadmin', 'admin')
-- AND (role_pages IS NULL OR NOT role_pages ? 'configuration');

-- Option 2: If you have a separate roles table with pages
-- UPDATE roles
-- SET pages = array_append(pages, 'configuration')
-- WHERE name IN ('SuperAdmin', 'Admin')
-- AND NOT ('configuration' = ANY(pages));

-- Option 3: If using a junction table (role_pages table)
-- INSERT INTO role_pages (role_id, page_id)
-- SELECT r.id, 'configuration'
-- FROM roles r
-- WHERE r.name IN ('SuperAdmin', 'Admin')
-- AND NOT EXISTS (
--   SELECT 1 FROM role_pages rp
--   WHERE rp.role_id = r.id AND rp.page_id = 'configuration'
-- );

-- Note: Adjust the above queries based on your actual database schema
-- The frontend fix in useUserPages.ts ensures superadmins always see all admin pages
