-- Anonymize a restored production dump before using it as stage data.
-- The script keeps relational shape/counts but removes production PII, sessions,
-- tokens and external storage pointers.

BEGIN;

DO $$
DECLARE
  stage_password_hash TEXT := '$2b$10$0QjLqji4LG9uzjkmGocYyOYmU0PfAVSVS9dMHyJeQCyPpqBVjIdkm';
BEGIN
  IF to_regclass('auth.users') IS NOT NULL THEN
    BEGIN
      WITH numbered AS (
        SELECT id, row_number() OVER (ORDER BY created_at, id) AS rn
        FROM auth.users
      )
      UPDATE auth.users u
      SET
        email = 'auth-' || numbered.rn || '@stage.local',
        encrypted_password = stage_password_hash,
        phone = NULL,
        raw_user_meta_data = jsonb_build_object('full_name', 'Usuario Stage ' || numbered.rn),
        updated_at = now()
      FROM numbered
      WHERE u.id = numbered.id;
    EXCEPTION
      WHEN undefined_column THEN
        RAISE NOTICE 'Skipping auth.users anonymization because expected columns differ.';
    END;
  END IF;

  IF to_regclass('public.profiles') IS NOT NULL THEN
    WITH numbered AS (
      SELECT
        id,
        role,
        row_number() OVER (PARTITION BY role ORDER BY created_at, id) AS rn
      FROM public.profiles
    )
    UPDATE public.profiles p
    SET
      email = lower(coalesce(numbered.role, 'user') || '-' || numbered.rn || '@stage.local'),
      full_name = CASE numbered.role
        WHEN 'admin' THEN 'Admin Stage ' || numbered.rn
        WHEN 'hr' THEN 'RH Stage ' || numbered.rn
        ELSE 'Mentorado Stage ' || numbered.rn
      END,
      whatsapp = '5585999' || lpad(numbered.rn::TEXT, 4, '0'),
      linkedin_url = 'https://www.linkedin.com/in/stage-' || numbered.rn,
      bio = 'Perfil ficticio gerado para testes em stage.',
      resume_url = NULL,
      avatar_url = NULL,
      career_focus = COALESCE(p.career_focus, 'Desenvolvimento Web'),
      origin_description = 'Origem ficticia para ambiente stage.',
      updated_at = now()
    FROM numbered
    WHERE p.id = numbered.id;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'password_hash'
    ) THEN
      EXECUTE format(
        'UPDATE public.profiles SET password_hash = %L, updated_at = now()',
        stage_password_hash
      );
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'portfolio_url'
    ) THEN
      EXECUTE
        'WITH numbered AS (
          SELECT id, row_number() OVER (ORDER BY created_at, id) AS rn
          FROM public.profiles
        )
        UPDATE public.profiles p
        SET portfolio_url = ''https://example.com/stage/portfolio/'' || numbered.rn
        FROM numbered
        WHERE p.id = numbered.id';
    END IF;

    IF to_regclass('auth.users') IS NOT NULL THEN
      BEGIN
        UPDATE auth.users u
        SET
          email = p.email,
          raw_user_meta_data = jsonb_build_object('full_name', p.full_name),
          updated_at = now()
        FROM public.profiles p
        WHERE u.id = p.id;
      EXCEPTION
        WHEN undefined_column THEN
          RAISE NOTICE 'Skipping auth.users/profile email sync because expected columns differ.';
      END;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.bookings') IS NOT NULL THEN
    WITH numbered AS (
      SELECT id, row_number() OVER (ORDER BY created_at, id) AS rn
      FROM public.bookings
    )
    UPDATE public.bookings b
    SET
      guest_name = 'Mentorado Stage ' || numbered.rn,
      guest_email = 'booking-' || numbered.rn || '@stage.local',
      guest_whatsapp = '5585888' || lpad(numbered.rn::TEXT, 4, '0'),
      notes = CASE WHEN b.notes IS NULL THEN NULL ELSE 'Observacao ficticia para teste.' END,
      google_event_id = NULL,
      google_meet_url = NULL,
      topics_discussed = CASE WHEN b.topics_discussed IS NULL THEN NULL ELSE 'Topicos ficticios discutidos em stage.' END,
      mentee_strengths = CASE WHEN b.mentee_strengths IS NULL THEN NULL ELSE 'Pontos fortes ficticios.' END,
      mentee_growth_areas = CASE WHEN b.mentee_growth_areas IS NULL THEN NULL ELSE 'Pontos de melhoria ficticios.' END,
      admin_notes = CASE WHEN b.admin_notes IS NULL THEN NULL ELSE 'Nota interna ficticia.' END,
      origin_description = CASE WHEN b.origin_description IS NULL THEN NULL ELSE 'Origem ficticia.' END,
      updated_at = now()
    FROM numbered
    WHERE b.id = numbered.id;
  END IF;

  IF to_regclass('public.payments') IS NOT NULL THEN
    UPDATE public.payments
    SET pix_txid = CASE WHEN pix_txid IS NULL THEN NULL ELSE 'stage-pix-' || left(id::TEXT, 8) END;
  END IF;

  IF to_regclass('public.jobs') IS NOT NULL THEN
    WITH numbered AS (
      SELECT id, row_number() OVER (ORDER BY created_at, id) AS rn
      FROM public.jobs
    )
    UPDATE public.jobs j
    SET
      company = 'Empresa Stage ' || numbered.rn,
      description = 'Descricao ficticia de vaga gerada para testes em stage.',
      location = COALESCE(j.location, 'Remoto'),
      salary_range = CASE WHEN j.salary_range IS NULL THEN NULL ELSE 'Faixa ficticia' END,
      application_url = CASE WHEN j.application_url IS NULL THEN NULL ELSE 'https://example.com/stage/jobs/' || numbered.rn END,
      required_language = CASE WHEN j.required_language IS NULL THEN NULL ELSE 'Ingles' END,
      updated_at = now()
    FROM numbered
    WHERE j.id = numbered.id;
  END IF;

  IF to_regclass('public.content_items') IS NOT NULL THEN
    UPDATE public.content_items
    SET
      url = CASE
        WHEN url IS NULL THEN NULL
        WHEN content_type = 'video' THEN 'https://www.youtube.com/watch?v=ysz5S6PUM-U'
        ELSE 'https://example.com/stage/content/' || left(id::TEXT, 8)
      END,
      links = CASE
        WHEN links IS NULL THEN NULL
        ELSE jsonb_build_array(jsonb_build_object(
          'label', 'Material stage',
          'url', 'https://example.com/stage/content/' || left(id::TEXT, 8)
        ))
      END,
      article_body = CASE WHEN article_body IS NULL THEN NULL ELSE 'Artigo ficticio para testes em stage.' END,
      updated_at = now();
  END IF;

  IF to_regclass('public.ads') IS NOT NULL THEN
    UPDATE public.ads
    SET
      image_url = NULL,
      image_alt = NULL,
      whatsapp_number = CASE WHEN whatsapp_number IS NULL THEN NULL ELSE '55857770000' END,
      link_url = CASE WHEN link_url IS NULL THEN NULL ELSE 'https://example.com/stage/ads/' || left(id::TEXT, 8) END,
      updated_at = now();
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.site_settings') IS NOT NULL THEN
    UPDATE public.site_settings
    SET value = '{"key":"stage@example.com","name":"Ambiente Stage","city":"Fortaleza","type":"email"}'::jsonb,
        updated_at = now()
    WHERE key = 'pix_config';

    UPDATE public.site_settings
    SET value = '{"is_connected":false,"connected_at":null}'::jsonb,
        updated_at = now()
    WHERE key = 'google_calendar';
  END IF;

  IF to_regclass('public.site_private_settings') IS NOT NULL THEN
    DELETE FROM public.site_private_settings;
  END IF;

  IF to_regclass('public.sessions') IS NOT NULL THEN
    DELETE FROM public.sessions;
  END IF;

  IF to_regclass('public.mentee_access_sessions') IS NOT NULL THEN
    DELETE FROM public.mentee_access_sessions;
  END IF;

  IF to_regclass('public.mentee_access_codes') IS NOT NULL THEN
    DELETE FROM public.mentee_access_codes;
  END IF;

  IF to_regclass('public.content_views') IS NOT NULL THEN
    UPDATE public.content_views
    SET visitor_hash = 'stage-visitor-' || left(id::TEXT, 8);
  END IF;
END $$;

COMMIT;
