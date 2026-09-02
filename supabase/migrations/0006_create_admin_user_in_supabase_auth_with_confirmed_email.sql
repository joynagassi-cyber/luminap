DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@mfe-jc.org') THEN
    PERFORM extensions.uuid_generate_v4();
    INSERT INTO auth.users (instance_id, id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'admin@mfe-jc.org',
      crypt('lumina-admin-2026', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"first_name": "Pasteur", "last_name": "Jean", "role": "ADMIN"}'
    );
  END IF;
END $$;