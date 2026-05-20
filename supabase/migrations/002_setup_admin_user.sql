-- Migration: Promover adrianomonteiroweb@gmail.com a admin
-- Execute APÓS o usuário ter feito signup na aplicação (via /register)
-- com o email adrianomonteiroweb@gmail.com
--
-- Passos:
-- 1. Acesse /register na aplicação
-- 2. Crie a conta com email adrianomonteiroweb@gmail.com e senha 123456
-- 3. Execute este SQL no Supabase SQL Editor

UPDATE public.profiles
SET role = 'admin'
WHERE email = 'adrianomonteiroweb@gmail.com';

-- Verificar resultado
SELECT id, email, full_name, role
FROM public.profiles
WHERE email = 'adrianomonteiroweb@gmail.com';
