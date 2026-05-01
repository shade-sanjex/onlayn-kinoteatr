-- Supabase SQL Editor da shu SQL ni ishga tushiring:
-- Dashboard: https://supabase.com/dashboard/project/qctrutxnzqdkygurnuix/editor

-- 1. gulimmatovsanjarbekk@gmail.com ni admin qilish
UPDATE profiles 
SET role = 'admin' 
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'gulimmatovsanjarbekk@gmail.com'
);

-- Natijani tekshirish:
SELECT p.id, p.display_name, p.role, u.email 
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE u.email = 'gulimmatovsanjarbekk@gmail.com';

-- 2. avatars storage bucket yaratish (agar yo'q bo'lsa)
-- Dashboard > Storage > New Bucket > Name: "avatars", Public: true
